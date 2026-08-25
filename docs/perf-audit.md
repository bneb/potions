# Component Performance Audit — app/components/Game/** (READ-ONLY)

Auditor: PERF TEAM. No component files were modified; findings below are for
the orchestrator to apply in integration. Method: full read of every file under
`app/components/Game/`, cross-checked against `app/globals.css` and the wiring
in `Game.tsx`; hot-path reasoning anchored to measured budgets in
`docs/perf-budgets.md`.

**Concurrency note:** another agent was actively editing `Game.tsx` while this
audit was written (celebration/pulse/mute-UI state being added). Line numbers
below were re-verified against the working tree at audit time;
`CelebrationOverlay.tsx` and `AnimalCarousel.tsx` were confirmed byte-stable
mid-audit. Integration finding for the orchestrator: `Game.tsx:73`
defensively invokes `(audioEngine as …).setMuted?.(muted)` "until the engine
adds setMuted" — the PERF TEAM's hardened engine now implements exactly that
API, so the guarded call becomes live with no component edit required (and the
localStorage-persisted mute at `Game.tsx:60` now produces zero audio nodes on
startup, before any user gesture).

## Priority ranking

| # | Sev | Component(s) | Finding | Est. impact on old iPads |
| --- | --- | --- | --- | --- |
| 1 | **P0** | `IridescentBackground.tsx` | 13 permanently-animated layers carry giant CSS blurs (60/70/80/100/40px full-screen waves + 30px orbs) | High — VRAM + fill-rate dominate frame time & battery |
| 2 | **P0** | `Game.tsx` | `animalStates` (incl. fresh JSX overlay arrays) rebuilt inline every render with new identities; all handlers recreated per render; no `useMemo`/`useCallback`/`React.memo` anywhere in the file | High — defeats any memoization; every tap re-renders all 24 carousel slots |
| 3 | P1 | `AnimalCarousel.tsx` | `componentMap` of 8 heavy SVG elements rebuilt *per item* *per render* (:160–170); zero `React.memo` in the carousel tree (grep-verified) | Medium-high — big SVG subtrees reconciled needlessly |
| 4 | ~~P1~~ → P3 | `CelebrationOverlay.tsx` | **Rewritten by teammate mid-audit** — now bounded (24 base × magnitude, hard cap 80 live, reduced-motion support). Remaining: `textShadow` glow on up to 80 particles + batch teardown/remount churn when bursts overlap during Surprise | Low-medium — paint cost only |
| 5 | P1 | `AnimalCarousel.tsx` | `handleScroll` runs per scroll event via `onScroll`, reads `scrollLeft/scrollWidth` then conditionally writes `scrollLeft` (:199–212), unthrottled | Medium during fling-scrolls |
| 6 | — | `Game.tsx` | ~~Double `applyBrewedEffect` per animal~~ — resolved by teammate's concurrent refactor | n/a |
| 7 | P2 | `.glass-shelf` (globals.css), `InstructionalPrompt.tsx` | `backdrop-filter: blur(20px)` over both footer shelves; `blur(8px)` over prompt overlay | Medium on old GPUs when shelves visible |
| 8 | ~~P3~~ | `AnimalCarousel.tsx` | ~~Mount-time setTimeout uncleaned~~ — resolved by concurrent rewrite (:190–194 now cleans up) | n/a |
| 9 | P3 | `AmbientParticles.tsx` | Dead code — mounted nowhere | Zero runtime; delete or wire up deliberately |

## Detail & recommended fixes

### 1. IridescentBackground — 13 blurred, animated layers (P0)

Evidence: four full-screen "wave" divs with `filter: blur(60–100px)`
(`IridescentBackground.tsx:35,49,63,77`), a shimmer layer `blur(40px)`
(:112), and 8 floating orbs `blur(30px)` (:96) — all `animation: ... infinite`.
The keyframes themselves only touch `transform`/`opacity`
(globals.css `softWave1–4`, `floatOrb`), which is compositor-friendly, but each
layer must first be **rasterized through its blur into a full-screen texture**
(at devicePixelRatio). On a Retina old iPad that is roughly
2048×1536×4 bytes ≈ 12–16 MB **per layer**, ~150 MB+ of textures for this one
component, plus re-filtering whenever scale keyframes resize a layer.

Recommendations (biggest win first):
1. Replace runtime `blur()` with pre-faded radial gradients — the existing
   gradients already end in `transparent`; increasing their falloff stops at
   ~90% of the visual effect for ~0% of the filter cost.
2. Collapse 4 wave layers + shimmer into ≤2 layers.
3. Gate every background animation behind `prefers-reduced-motion` and pause
   them via `animation-play-state` when `document.hidden` (a kid staring at
   animals doesn't need a moving backdrop).
4. Or pre-render the whole backdrop to a single static WebP (~50 KB) —
   indistinguishable for a blurred gradient scene.

Estimated impact: removes the largest constant GPU consumer in the game;
on A10-class iPads this alone plausibly recovers several ms/frame and
meaningful battery.

### 2. Game.tsx — per-render identity churn defeats memoization (P0)

Evidence:
- `animalStates` is assembled as fresh objects + freshly-created JSX overlay
  elements on **every render** (`Game.tsx:292–334`), then handed to
  `AnimalCarousel`. Even if the carousel were wrapped in `React.memo`, the new
  `animalStates` reference (and new element identities inside) would force a
  full re-render of all 24 slots (8 animals × 3 infinite-strip copies).
- Every handler (`handleUsePotion`, `handleGiveTreat`, `handleSelect`,
  `handleReset`, `handleSurprise`, `handleApplyBrewedEffect`,
  `triggerCelebration`) is recreated each render, so children taking them as
  props can never bail out either.

Recommended shape (orchestrator applies):
1. Memoize per-animal view data (`useMemo` over `effects` + `selectedIds`),
   producing stable `AnimalState` objects; build overlay JSX inside the leaf
   that renders it, keyed by primitive data instead of element instances.
2. Wrap handlers in `useCallback` (they already close over state via updater
   forms, so deps are small), or move the interaction logic into the
   teammate's pure `gameReducer` + `useReducer` — reducers give stable
   `dispatch` for free.
3. Wrap `AnimalCarousel`, shelves, `Sorcerer`, `IridescentBackground` in
   `React.memo`.

Estimated impact: a potion tap currently re-renders essentially the whole tree
(header buttons, 24 carousel slots with their SVG subtrees, shelves). With
stable props, only the ≤8 affected animal wrappers reconcile. This is the
largest JS-side render-cost reduction available without changing visuals.

### 3. AnimalCarousel — per-item component map, no memo (P1)

Evidence: `renderAnimalComponent` constructs a `Record` of eight JSX SVG
subtrees for **each of the 24 strip items** on every render
(`AnimalCarousel.tsx:160–170`). Trex/Dragon/etc. are ~150-line SVG components;
React must diff all of them after every parent state change.

Fix: hoist a module-level `const ANIMAL_COMPONENTS: Record<AnimalId,
React.ComponentType<{selected:boolean;className?:string}>>` and render
`<Comp selected={isSelected}/>`; wrap each animal component in `React.memo`
(props are primitives → effective). Combined with #2, untouched animals skip
reconciliation entirely.

### 4. CelebrationOverlay — rebuild + glow per trigger (P1)

Evidence: each `trigger` bump regenerates 20 particles and clears them 1500 ms
later (:14–29). During a Surprise cascade `triggerCelebration()` fires every
700 ms, so the 20-node confetti DOM is torn down and rebuilt mid-animation
instead of continuing; every particle carries inline `filter: blur(2px)` +
`boxShadow: 0 0 10px <color>` (:46–47) = 20 blurred, glowing paints per burst.
Particle size also uses `Math.random()` *inside* style (:44–45) — harmless at
runtime (client-only by then) but non-deterministic across re-renders.

Fixes: keep particles mounted and restart via `key` change or Web Animations
API; drop `blur(2px)` (at 10–20 px it is nearly invisible but not free);
replace boxShadow glow with a pre-baked radial-gradient background; respect
`prefers-reduced-motion` (skip confetti entirely).

### 5. Carousel scroll handler (P1)

Evidence: `handleScroll` reads layout (`scrollLeft`, `scrollWidth`) on every
scroll event and conditionally writes `scrollLeft`
(`AnimalCarousel.tsx:199–212`, attached via the `onScroll` prop). Writes happen
only near strip boundaries (good), but the unconditional layout queries add
sync-layout pressure during flings.

Fix: rAF-throttle the handler and attach via `addEventListener('scroll', fn,
{passive:true})` in an effect (also enables removal on unmount). Logic itself
is sound — no change needed to the wrapping math.

### 6–9. Smaller items

- **Double `applyBrewedEffect`** — resolved during the audit window by the
  teammate's refactor (`Game.tsx` now computes `effectState` once inside
  `setEffects`; the second `setOverflowLevels` pass no longer exists).
- **Backdrop blur on shelves**: `.glass-shelf { backdrop-filter: blur(20px) }`
  covers two large footer panels; halving radius or switching to
  `background: rgba(255,255,255,0.12)` keeps the look for most of the cost.
  Same class of fix for `InstructionalPrompt`'s `blur(8px)`.
- **Uncleaned mount timeout** (`AnimalCarousel.tsx:41`): capture id, clear in
  effect cleanup. One-shot, low priority.
- **AmbientParticles**: currently unmounted everywhere. If the orchestrator
  plans to use it, note its 15 bubbles + 8 sparkles are bounded and pure CSS
  (safe); otherwise delete.

## Verified-OK list (no action needed)

- Surprise timers are tracked in a ref and cleared on re-tap **and** unmount
  (`Game.tsx:33–34,156–157`).
- `CelebrationOverlay` and `InstructionalPrompt` timers have proper effect
  cleanups.
- No `setInterval` and no `requestAnimationFrame` loops exist anywhere under
  `app/components/Game/**` — no rAF leaks possible today.
- Particle counts are bounded constants (15+8 ambient if ever mounted, 20
  confetti, 5 rainbow oscillators) — nothing scales unboundedly with taps.
- `AlchemistLaboratory` already uses `useMemo`/`useCallback` correctly for its
  own derived state; its child props become fully stable once #2 lands.
- All audio node creation is start/stop-paired (enforced by
  `tests/perf-audio.test.ts` after hardening).
