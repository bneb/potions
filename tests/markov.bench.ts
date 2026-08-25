import { bench, describe } from 'vitest';
import { walkFx } from '@/lib/markov';

/**
 * Micro-benchmarks for the Markov FX walk (app/lib/markov.ts).
 *
 * walkFx(4) is the production shape: Game.handleSurprise() calls walkFx(4)
 * once per Surprise tap and then fans the 4 steps out over setTimeout.
 *
 * walkFx(32) / walkFx(256) exist to demonstrate O(n) scaling empirically:
 * ops/s should stay roughly flat as `steps` grows (work is linear in n).
 */

let sink: unknown;

bench('walkFx(4)', () => {
    sink = walkFx(4);
}, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

bench('walkFx(32)', () => {
    sink = walkFx(32);
}, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

bench('walkFx(256)', () => {
    sink = walkFx(256);
}, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

export { sink as markovBenchSink };
