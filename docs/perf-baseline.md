# Performance Baseline — Magic Potions hot paths

Measured **before** any engine changes (this file is the immutable reference the
budget check in `docs/perf-budgets.md` and the before/after claims are judged
against). Raw capture: tinybench task results serialized verbatim during the
run (see "Reproduction" below).

## Machine & environment

| Item | Value |
| --- | --- |
| CPU | Apple M4 (10 cores: 4P + 6E), arm64 |
| RAM | 24 GB |
| OS | macOS (darwin-arm64) |
| Node | v26.7.0 |
| Runner | Vitest 3.2.7 benchmark mode (tinybench 4.x), jsdom environment, `tests/setup.ts` applied |
| Execution | `fileParallelism: false`, one worker, fresh process |

## Methodology

- **Warmup:** every bench sets `warmupIterations` (uniformly 20,000) *and*
  `warmupTime` (150 ms) so JIT tier-up settles before sampling begins.
- **Sampling:** `time: 500 ms`; iteration caps (`iterations`) sized so the time
  bound governs fast paths while slow paths stop at the cap. Verified against
  tinybench 4.1.0 source: the run loop continues while
  `elapsed < time || samples < iterations`, i.e. a bench ends only when *both*
  bounds hold — caps were chosen accordingly.
- **Dead-code elimination guard:** every measured call assigns its result to an
  outer-scope `sink` (`export { sink as ... }` escapes the module), so V8
  cannot fold the work away. Functions here allocate observable objects
  (`BrewedEffect`, arrays), which further resists scalar replacement.
- **Median:** taken from the finished task's benchmark result object — the
  `median` field computed by Vitest's bench runner from tinybench's sorted
  samples (tinybench itself emits hz/mean/percentiles, not median). Values were
  captured programmatically from `ctx.state.getFiles()` immediately after the
  run; the tables below are transcribed from that capture.
- **Timer-granularity artifact:** many medians land on repeated values like
  0.000042 / 0.000083 ms. That is clock-tick quantization (the `min` columns
  showing 0.0000 reveal sub-resolution samples), not rounding by hand. It also
  explains why `hz` and `1000/median` can diverge on heavy-tailed rows: rare GC
  outliers inflate the mean that drives `hz`, while the median sits at the tick
  floor.
- **Audio benches use a plain-JS fake AudioContext installed by the bench file
  itself** (never `vi.fn()`): the shared mocks in `tests/setup.ts` retain every
  constructed node in their call history, which OOM'd a worker at ~4 GB heap
  during multi-million-iteration runs. The fake records only counters. The
  singleton reads `window.AudioContext` lazily, so installing it inside the
  bench file is sufficient and touches nothing outside our owned files.
- **Caveat:** absolute numbers are M4/Node-class. Old-iPad pass/fail is decided
  in `docs/perf-budgets.md` via frame-math headroom (≥1000×), not by
  transplanting these values.

## Results (median ops/s; medians in ms/op)

### `brewPotion` (app/lib/potionLogic.ts)

| Cauldron state | Median ops/s | Median ms/op | RME |
| --- | --- | --- | --- |
| empty cauldron | 17,674,957 | 0.000042 | ±3.0% |
| single element (`['blue_root']`) | 5,779,045 | 0.000167 | ±2.6% |
| synergy pair (`water+air`) | 1,287,745 | 0.000709 | ±2.6% |
| volatile config (3×fire, heat 5) | 1,017,030 | 0.000917 | ±1.1% |
| 6-ingredient max | **569,942** | 0.001625 | ±0.6% |

Worst realistic case costs ~1.6 µs. The cost grows with ingredient count
because `getIngredientElement/color` do a linear `INGREDIENTS.find` per
ingredient (m=6 catalog) — still negligible at game rates.

### `applyBrewedEffect`

| Input | Median ops/s | Median ms/op | RME |
| --- | --- | --- | --- |
| typical effect (default tolerance) | 15,380,699 | 0.000042 | ±0.3% |
| volatile explosion | 12,331,959 | 0.000083 | ±2.7% |
| aether-modified effect | 12,631,948 | 0.000083 | ±3.7% |
| custom tolerance 1.5 | 12,599,328 | 0.000083 | ±1.3% |

### `getRecipeName`

| Input | Median ops/s | Median ms/op | RME |
| --- | --- | --- | --- |
| known effect (title-case path) | 1,149,522 | 0.000375 | ±9.6% |
| unknown primary (fallback) | 4,522,994 | 0.000084 | ±3.2% |

The regex title-casing makes named recipes ~4× pricier than the fallback —
still sub-microsecond.

### `walkFx` (app/lib/markov.ts) — O(n) scaling evidence

| Steps | Median ops/s | Median ms/op | Per-step cost |
| --- | --- | --- | --- |
| 4 (production shape) | 3,307,033 | 0.000291 | 0.073 µs |
| 32 | 517,729 | 0.001917 | 0.060 µs |
| 256 | 65,735 | 0.015000 | 0.059 µs |

Per-step cost stays flat (~0.06–0.07 µs) as n grows 64×: the walk is **O(n)**
with no quadratic behavior. (4→32 is 6.4× slower for 8× steps because fixed
start-up overhead amortizes away; 32→256 tracks 8× almost exactly.)

### `audioEngine` param-envelope construction (fake context, steady state)

| Sound (nodes) | Median ops/s | Median ms/op |
| --- | --- | --- |
| playPop (1 osc + 1 gain) | 15,146,289 | 0.000083 |
| playGrowth (1 osc + 1 gain) | 16,453,334 | 0.000042 |
| playMagic (4 osc + 4 gain) | 12,186,569 | 0.000083 |
| playRainbow (5 osc + 5 gain) | 10,819,524 | 0.000083 |

Feasibility answer for deliverable (e): the param-envelope construction path
**is** benchmarkable headlessly — see methodology note about the fake context.
In-browser costs differ (real node construction + audio-thread handoff), which
the budget doc accounts for with headroom.

## Noise notes

- p999/max columns show GC scavenge blips (e.g. single 33 µs outlier in
  `getRecipeName/known effect`); medians and RMEs are unaffected.
- Within one process, RMEs are small (<±12%). Across whole-suite re-runs,
  however, individual rows were later observed to swing up to ~1.7× in either
  direction even for byte-identical code (CPU frequency scaling / JIT tiering /
  GC phase). Treat any single-row ratio below ~2× as noise; see the controlled
  A/B methodology in `docs/perf-budgets.md` used for all regression verdicts.

## Reproduction

```bash
# default reporter (human table)
npx vitest bench --run --no-file-parallelism
```

Medians were captured programmatically from `ctx.state.getFiles()` →
`task.result.benchmark.median` immediately after the run (Vitest's JSON
reporter does not emit bench tasks), using the same flags.
