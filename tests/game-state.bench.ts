import { bench, describe } from 'vitest';
import {
    createInitialGameState,
    gameReducer,
    deriveAnimalViews,
    type GamePhaseState,
} from '@/lib/gameState';
import { AnimalIds, AnimalId } from '@/lib/schemas';

/**
 * Benchmarks for app/lib/gameState.ts (teammate-owned pure reducer).
 *
 * These mirror the real interaction mix: toggle taps, potion/treat
 * applications across all 8 selected animals, surprise steps, and the
 * per-render view derivation. Same DCE-guard sink pattern as the other
 * bench files.
 */

let sink: unknown;

const ANIMAL_IDS = AnimalIds as readonly string[];

const ALL_SELECTED: GamePhaseState = createInitialGameState();
ALL_SELECTED.selectedIds = ANIMAL_IDS.slice() as AnimalId[]; // all eight friends selected

describe('gameState.gameReducer', () => {
    bench('TOGGLE_SELECT_ANIMAL (deselect from full)', () => {
        sink = gameReducer(ALL_SELECTED, { type: 'TOGGLE_SELECT_ANIMAL', id: 'trex' });
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('SELECT_ALL_ANIMALS', () => {
        sink = gameReducer(createInitialGameState(), { type: 'SELECT_ALL_ANIMALS' });
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('APPLY_POTION growth (8 selected)', () => {
        sink = gameReducer(ALL_SELECTED, { type: 'APPLY_POTION', potionType: 'growth' });
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('GIVE_TREAT hotdog (8 selected)', () => {
        sink = gameReducer(ALL_SELECTED, { type: 'GIVE_TREAT', treatType: 'hotdog' });
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('APPLY_SURPRISE_STEP (8 selected)', () => {
        sink = gameReducer(ALL_SELECTED, {
            type: 'APPLY_SURPRISE_STEP',
            scale: 1.35,
            filter: '',
            classes: ['animate-pulse-grow'],
        });
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('APPLY_BREWED_EFFECT (8 selected)', () => {
        sink = gameReducer(ALL_SELECTED, { type: 'APPLY_BREWED_EFFECT', primary: 'growth', intensity: 1.5 });
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });
});

describe('gameState.deriveAnimalViews', () => {
    bench('derive views for all 8 animals (post-potion state)', () => {
        const withPotion = gameReducer(ALL_SELECTED, { type: 'APPLY_POTION', potionType: 'rainbow' });
        sink = deriveAnimalViews(withPotion);
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });
});

export { sink as gameStateBenchSink };
