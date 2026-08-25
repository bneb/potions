import { bench, describe } from 'vitest';
import { brewPotion, applyBrewedEffect, getRecipeName, type BrewedEffect } from '@/lib/potionLogic';
import type { CauldronState } from '@/lib/schemas';

/**
 * Micro-benchmarks for app/lib/potionLogic.ts (read-only module; we measure it).
 *
 * Methodology notes:
 * - Every bench assigns its result to the outer-scope `sink` so V8 cannot
 *   dead-code-eliminate the measured call.
 * - warmupIterations + warmupTime let JIT tier-up settle before sampling;
 *   `time` is the binding constraint for these sub-microsecond functions.
 * - Absolute numbers are Apple-M4-class Node numbers. Old-iPad budgets are
 *   derived separately in docs/perf-budgets.md via frame math, not by
 *   transplanting these absolute values.
 */

let sink: unknown;

// --- Representative cauldron states -------------------------------------

const EMPTY: CauldronState = {
    ingredients: [],
    heat: 1,
    intensity: 1.0,
    brewTime: 2,
};

const SINGLE_ELEMENT: CauldronState = {
    ingredients: ['blue_root'], // water
    heat: 1,
    intensity: 1.0,
    brewTime: 2,
};

const SYNERGY_PAIR: CauldronState = {
    ingredients: ['blue_root', 'sparkle_dust'], // water+air -> levitation
    heat: 2,
    intensity: 1.0,
    brewTime: 3,
};

// 2+ fire + heat>=4 + intensity>1.5 => volatile_explosion branch
const VOLATILE_CONFIG: CauldronState = {
    ingredients: ['fire_bloom', 'fire_bloom', 'fire_bloom'],
    heat: 5,
    intensity: 2.0,
    brewTime: 1,
};

const SIX_INGREDIENT_MAX: CauldronState = {
    ingredients: [
        'blue_root',
        'sparkle_dust',
        'fire_bloom',
        'moon_moss',
        'rainbow_shard',
        'shadow_berry',
    ],
    heat: 3,
    intensity: 1.5,
    brewTime: 4,
};

// --- Typical BrewedEffects for downstream functions ----------------------

const TYPICAL_EFFECT: BrewedEffect = brewPotion(SYNERGY_PAIR);
const VOLATILE_EFFECT: BrewedEffect = brewPotion(VOLATILE_CONFIG);
const MODIFIED_EFFECT: BrewedEffect = brewPotion(SIX_INGREDIENT_MAX); // has visualModifier (aether)

describe('potionLogic.brewPotion', () => {
    bench('empty cauldron', () => {
        sink = brewPotion(EMPTY);
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('single element', () => {
        sink = brewPotion(SINGLE_ELEMENT);
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('synergy pair', () => {
        sink = brewPotion(SYNERGY_PAIR);
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('volatile config', () => {
        sink = brewPotion(VOLATILE_CONFIG);
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('6-ingredient max', () => {
        sink = brewPotion(SIX_INGREDIENT_MAX);
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });
});

describe('potionLogic.applyBrewedEffect', () => {
    bench('typical effect (default tolerance)', () => {
        sink = applyBrewedEffect(TYPICAL_EFFECT);
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('volatile explosion', () => {
        sink = applyBrewedEffect(VOLATILE_EFFECT);
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('aether-modified effect', () => {
        sink = applyBrewedEffect(MODIFIED_EFFECT);
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('custom tolerance 1.5', () => {
        sink = applyBrewedEffect(TYPICAL_EFFECT, 1.5);
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });
});

describe('potionLogic.getRecipeName', () => {
    bench('known effect', () => {
        sink = getRecipeName(TYPICAL_EFFECT);
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('unknown primary (fallback)', () => {
        sink = getRecipeName({ ...TYPICAL_EFFECT, primary: 'no_such_effect' });
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });
});

export { sink as potionLogicBenchSink };
