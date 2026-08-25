# Performance Budgets — hot functions, frame-math justified

Frame math baseline: the game targets 60 fps on old iPads → **16.67 ms/frame**.
We reserve at most half of any frame's main-thread time for game logic after
style/layout/paint/compositing → **~8 ms/frame JS budget**, and we further
demand that no single hot function ever consume a meaningful slice of it.
Because our lab numbers come from M4-class silicon (see `docs/perf-baseline.md`),
every budget requires **≥1000× headroom** between the gameplay ceiling and the
budget floor: even if an old iPad executes JS ~50× slower and GC jitter eats
another ~20×, a function meeting its budget still cannot dent a frame.

## Gameplay ceilings (derived from Game.tsx wiring)

| Function | When it runs | Ceiling |
| --- | --- | --- |
| `walkFx(4)` | Surprise tap fans 4 steps over setTimeout(700 ms); taps clear prior timers → ≤10 effect steps/s worst case | 10/s |
| `brewPotion` | Kid tapping brew/apply in Alchemist Lab; double-tap ceiling | 2/s |
| `applyBrewedEffect` | once per selected animal per application step; ≤8 animals × ≤10 steps/s | 80/s |
| `getRecipeName` | recipe label/discovery list on brew | 2/s |
| audio envelope construction | one sound per tap; heaviest sound = 5 nodes → ≤5 sounds/s × 5 envelopes | 25 envelopes/s |

## Budgets & verdicts (measured medians from docs/perf-baseline.md)

| Function (worst measured case) | Gameplay ceiling | Budget (ops/s, = 1000× ceiling) | Headroom | Measured median ops/s | Margin over budget | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| `brewPotion` — 6-ingredient max | 2/s | ≥ 10,000 (5000×) | 5000× | 569,942 | 57× above budget (284,971× above ceiling) | **PASS** |
| `applyBrewedEffect` — volatile explosion | 80/s | ≥ 100,000 (1250×) | 1250× | 12,331,959 | 123× above budget (154,149× above ceiling) | **PASS** |
| `getRecipeName` — known effect | 2/s | ≥ 10,000 (5000×) | 5000× | 1,149,522 | 115× above budget | **PASS** |
| `walkFx(4)` | 10 steps/s | ≥ 10,000 (1000×) | 1000× | 3,307,033 | 331× above budget (330,703× above ceiling) | **PASS** |
| audio envelope construction (playRainbow) | 25 envelopes/s | ≥ 25,000 (1000×) | 1000× | 10,819,524 | 433× above budget | **PASS** (caveat below) |

Ceiling note: `applyBrewedEffect` (lib function) is costed at 80/s because the
Game loop amplifies one application step into ≤8 per-animal calls, whereas the
teammate reducer's `APPLY_BREWED_EFFECT` action processes all animals inside a
single dispatch and is therefore costed at the 20 dispatches/s tap ceiling.
Same interaction, different call granularity.

### Audio caveat

Audio medians are against a plain-JS fake context; real Web Audio node
construction is browser-internal and more expensive per node. Rather than
invent a multiplier: even at an extreme assumption of ~100 µs main-thread cost
per sound construction (~1000× the fake path, and far above typical real-world
node creation), the gameplay ceiling of ≤5 sounds/s costs ≤0.5 ms/s — i.e.
~6% of *one* 8 ms frame budget per second of play. The budget's job (bound
main-thread envelope-construction work) is met with orders of magnitude to
spare under any defensible constant. Additionally, Web Audio rendering itself
happens off the main thread (audio rendering thread), so envelope construction
is the only main-thread cost we can and need to control.

## Regression gate for hardening

Deliverable 3 rewires `audioEngine` internals. Gate definition (revised after
noise analysis below): **an interleaved controlled A/B, ≥3 paired runs per
side, same harness, same machine state** — a verdict requires the hardened
side to be equal-or-faster in the paired comparison, not merely "within 2× of
a single historical number".

Why not "within 2× of baseline": re-running the *unchanged* potion-logic bench
suite produced swings up to ~1.7× between whole-suite reruns, and an
independent reviewer's reruns observed up to ~4–5× drift on individual
potionLogic rows depending on whether the file ran solo or alongside others
(CPU frequency scaling / JIT tiering / GC phase / worker history). Sub-microsecond
medians wobble at that scale; single-number gates are meaningless here — which
is exactly why every budget demands ≥1000× headroom instead.

### Interleaved A/B ×3: original (`git show HEAD`) vs hardened engine

Alternating runs, identical flags, fresh process each round:

| Sound | Orig med (ops/s, 3 runs) | Hard med | Hard wins? |
| --- | --- | --- | --- |
| playPop | 24,168,641 (23.2–24.2 M) | **27,496,082** (25.5–27.5 M) | 3/3 |
| playGrowth | 24,281,334 (20.1–25.4 M) | **27,296,511** (27.1–27.5 M) | 3/3 |
| playMagic | 19,296,321 (16.1–20.0 M) | **21,914,615** (21.8–23.9 M) | 3/3 |
| playRainbow | 18,669,308 (16.0–19.2 M) | **20,116,467** (18.7–21.2 M) | 3/3 (ties r1) |

Hardened is equal-or-faster in every paired round for every sound (sign test:
if the engines were equivalent, 12 consecutive wins/ties would occur with
probability 2⁻¹² ≈ 0.02%). Attribution, honestly stated: HEAD allocated a
promise per play call via its unconditional `this.init()`; hardening removes
that work and adds one boolean branch (the suspended-resume self-heal lives on
the context-construction path only, not the steady-state hot path). The delta
is dominated by the *removal*, not by the addition being free — either way,
**gate: PASS**, and both sides sit ≥5 orders of magnitude above the audio
budget floor.

## Teammate module (informational): app/lib/gameState.ts

Benched as instructed once it landed and compiled. Budget floors below are
1000× each row's own ceiling (dispatch ceilings differ per action; view
derivation is bounded by render rate).

| Operation | Ceiling | Budget (= 1000× ceiling) | Measured median ops/s | Verdict |
| --- | --- | --- | --- | --- |
| `gameReducer` TOGGLE_SELECT_ANIMAL | 10/s | ≥ 10,000 | 6,183,732 | **PASS** |
| `gameReducer` APPLY_POTION (8 sel) | 20/s | ≥ 20,000 | 1,343,925 | **PASS** |
| `gameReducer` GIVE_TREAT (8 sel) | 20/s | ≥ 20,000 | 874,926 | **PASS** |
| `gameReducer` APPLY_SURPRISE_STEP (8 sel) | 80/s | ≥ 80,000 | 1,406,497 | **PASS** |
| `gameReducer` APPLY_BREWED_EFFECT (8 sel) | 20/s | ≥ 20,000 | 1,228,548 | **PASS** |
| `deriveAnimalViews` (8 animals) | 60/s | ≥ 60,000 | 741,829 | **PASS** |

(Re-run after bench cleanup: all rows comfortably above their raised floors —
e.g. TOGGLE 13.4M, APPLY_POTION 2.85M, deriveAnimalViews 1.24M in the latest
capture; verdicts unchanged.)

## Failure protocol

No budget FAILED, so no optimization was mandatory under this protocol. For
completeness: `potionLogic.ts` is read-only for PERF TEAM — had any of its
budgets failed, the documented plan would be (a) memoize ingredient id→element/
color lookups with a module-level `Map` (removes the O(m) `.find` per
ingredient), (b) precompute the single-element effects record outside the
function body. Estimated impact: brings the 6-ingredient case within ~1.2× of
the synergy-pair case (~35% faster), based on the observed cost curve across
ingredient counts in the baseline table. The orchestrator may apply this if
future content grows the ingredient catalog (cost scales linearly with catalog
size m today).
