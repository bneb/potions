import { describe, it, expect } from 'vitest';
import {
    createInitialGameState,
    gameReducer,
    deriveAnimalViews,
    hasSelection,
    isAllSelected,
    buildBrew,
    MAX_TREATS_PER_ANIMAL,
    type GamePhaseState as GameState,
} from '@/lib/gameState';
import { AnimalId } from '@/lib/schemas';
import { ANIMALS } from '@/lib/data';

/**
 * CHARACTERIZATION TESTS — Loop 1: selection semantics.
 * These encode the exact behavior of Game.tsx:
 *   - handleSelect (toggle, append-at-end order)
 *   - handleToggleSelectAll (all in canonical ANIMALS order / clear)
 * plus the new pure-module API (factory + reducer).
 */
describe('gameState: initial state factory', () => {
    it('starts with no animals selected', () => {
        const s = createInitialGameState();
        expect(s.selectedIds).toEqual([]);
    });

    it('gives every animal from ANIMALS a neutral effect entry', () => {
        const s = createInitialGameState();
        for (const a of ANIMALS) {
            expect(s.effects[a.id]).toEqual({
                scale: 1,
                filter: '',
                classes: [],
                treats: [],
            });
        }
    });

    it('covers exactly the animals in the canonical ANIMALS list', () => {
        const s = createInitialGameState();
        expect(Object.keys(s.effects).sort()).toEqual(
            ANIMALS.map(a => a.id).sort()
        );
    });
});

describe('gameState: TOGGLE_SELECT_ANIMAL (Game.tsx handleSelect)', () => {
    it('adds an unselected animal to the end of the selection', () => {
        let s = createInitialGameState();
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'husky' });
        expect(s.selectedIds).toEqual(['husky']);
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'trex' });
        expect(s.selectedIds).toEqual(['husky', 'trex']);
    });

    it('removes an already-selected animal, preserving the order of the rest', () => {
        let s = createInitialGameState();
        for (const id of ['trex', 'husky', 'dragon'] as const) {
            s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id });
        }
        expect(s.selectedIds).toEqual(['trex', 'husky', 'dragon']);
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'husky' });
        expect(s.selectedIds).toEqual(['trex', 'dragon']);
    });

    it('toggling the same animal twice returns to not-selected', () => {
        let s = createInitialGameState();
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'santa' });
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'santa' });
        expect(s.selectedIds).toEqual([]);
    });

    it('selection state is independent of effect state', () => {
        let s = createInitialGameState();
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'dragon' });
        expect(s.effects.dragon).toEqual({
            scale: 1,
            filter: '',
            classes: [],
            treats: [],
        });
    });
});

describe('gameState: SELECT_ALL_ANIMALS + CLEAR_SELECTION', () => {
    it('selects every animal in canonical ANIMALS order', () => {
        let s = createInitialGameState();
        s = gameReducer(s, { type: 'SELECT_ALL_ANIMALS' });
        expect(s.selectedIds).toEqual(ANIMALS.map(a => a.id));
    });

    it('canonical order wins even if some animals were toggled first', () => {
        let s = createInitialGameState();
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'dragon' });
        s = gameReducer(s, { type: 'SELECT_ALL_ANIMALS' });
        expect(s.selectedIds).toEqual(ANIMALS.map(a => a.id));
    });

    it('is idempotent', () => {
        let s = createInitialGameState();
        s = gameReducer(s, { type: 'SELECT_ALL_ANIMALS' });
        s = gameReducer(s, { type: 'SELECT_ALL_ANIMALS' });
        expect(s.selectedIds).toEqual(ANIMALS.map(a => a.id));
    });

    it('CLEAR_SELECTION empties the selection but keeps effects', () => {
        let s = createInitialGameState();
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'orangutan' });
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'banana' });
        s = gameReducer(s, { type: 'CLEAR_SELECTION' });
        expect(s.selectedIds).toEqual([]);
        expect(s.effects.orangutan.treats).toEqual(['banana']);
    });
});

describe('gameState: purity & immutability', () => {
    it('does not mutate the previous state object', () => {
        const before = createInitialGameState();
        const snapshot = JSON.parse(JSON.stringify(before)) as typeof before;
        gameReducer(before, { type: 'TOGGLE_SELECT_ANIMAL', id: 'husky' });
        gameReducer(before, { type: 'SELECT_ALL_ANIMALS' });
        expect(before).toEqual(snapshot);
    });

    it('no effect-mutating action mutates prior state, arrays included', () => {
        const before = createInitialGameState();
        let s = select(['orangutan'])(before);
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'pizza' });
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'rainbow' });
        s = gameReducer(s, {
            type: 'APPLY_SURPRISE_STEP',
            scale: 1.2,
            filter: 'blur(1px)',
            classes: ['fx-a'],
        });
        s = gameReducer(s, { type: 'APPLY_BREWED_EFFECT', primary: 'growth', intensity: 1 });
        s = gameReducer(s, { type: 'RESET_SELECTED' });
        expect(before).toEqual(createInitialGameState());
        // Untouched animals keep their exact entry reference (cheap React renders).
        expect(s.effects.dragon).toBe(before.effects.dragon);
    });

    it('returns a new state reference on a change', () => {
        const before = createInitialGameState();
        const after = gameReducer(before, { type: 'TOGGLE_SELECT_ANIMAL', id: 'husky' });
        expect(after).not.toBe(before);
        expect(after.selectedIds).not.toBe(before.selectedIds);
    });
});

/**
 * Hydration robustness: persisted state (localStorage JSON from an older
 * build) can be SPARSE even though the type says every animal has an entry.
 * The reducer and view helper must tolerate missing entries.
 */
describe('gameState: sparse/hydrated state robustness', () => {
    it('GIVE_TREAT on a sparse state creates the missing entry instead of throwing', () => {
        const sparse = {
            selectedIds: ['crocodile'],
            effects: { crocodile: { scale: 2, filter: '', classes: [], treats: [] } },
        } as unknown as GameState;
        const after = gameReducer(sparse, { type: 'GIVE_TREAT', treatType: 'hotdog' });
        expect(after.effects.crocodile.treats).toEqual(['hotdog']);
        expect(after.effects.crocodile.scale).toBe(2); // visuals untouched
    });

    it('deriveAnimalViews renders a neutral default for animals missing entries', () => {
        const sparse = {
            selectedIds: [],
            effects: {},
        } as unknown as GameState;
        const views = deriveAnimalViews(sparse);
        for (const a of ANIMALS) {
            expect(views[a.id].scale).toBe(1);
            expect(views[a.id].overlayEmojis).toEqual([]);
        }
    });
});

/**
 * CHARACTERIZATION TESTS — Loop 2: APPLY_POTION.
 * Game.tsx handleUsePotion semantics per selected animal:
 *   1. reset scale -> 1 and filter -> ''
 *   2. strip the 'animate-rainbow' class (ONLY that class)
 *   3. apply the new potion effect
 *   4. treats are carried over untouched
 */
const select = (ids: Array<AnimalId>) => (s: GameState) =>
    ids.reduce((acc, id) => gameReducer(acc, { type: 'TOGGLE_SELECT_ANIMAL', id }), s);

describe('gameState: APPLY_POTION (Game.tsx handleUsePotion)', () => {
    it('no selection => no-op returning the same state', () => {
        const s = createInitialGameState();
        const after = gameReducer(s, { type: 'APPLY_POTION', potionType: 'growth' });
        expect(after).toBe(s);
    });

    it.each([
        ['growth', { scale: 1.3 }],
        ['shrink', { scale: 0.7 }],
    ] as const)('%s potion sets the exact Game.tsx scale', (potionType, expected) => {
        let s = createInitialGameState();
        s = select(['trex'])(s);
        s = gameReducer(s, { type: 'APPLY_POTION', potionType });
        expect(s.effects.trex.scale).toBe(expected.scale);
        expect(s.effects.trex.filter).toBe('');
    });

    it.each([
        ['red', 'sepia(1) saturate(5) hue-rotate(-50deg)'],
        ['purple', 'sepia(1) saturate(5) hue-rotate(220deg)'],
        ['sunshine', 'sepia(1) saturate(10) hue-rotate(0deg) drop-shadow(0 0 15px gold)'],
    ] as const)('%s potion sets the exact Game.tsx filter', (potionType, filter) => {
        let s = createInitialGameState();
        s = select(['husky'])(s);
        s = gameReducer(s, { type: 'APPLY_POTION', potionType });
        expect(s.effects.husky.scale).toBe(1);
        expect(s.effects.husky.filter).toBe(filter);
    });

    it('rainbow potion adds the animate-rainbow class and leaves scale/filter neutral', () => {
        let s = createInitialGameState();
        s = select(['scorpion'])(s);
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'rainbow' });
        expect(s.effects.scorpion.classes).toEqual(['animate-rainbow']);
        expect(s.effects.scorpion.scale).toBe(1);
        expect(s.effects.scorpion.filter).toBe('');
    });

    it('rainbow applied twice never duplicates the class', () => {
        let s = createInitialGameState();
        s = select(['scorpion'])(s);
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'rainbow' });
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'rainbow' });
        expect(s.effects.scorpion.classes).toEqual(['animate-rainbow']);
    });

    it('a new potion resets scale/filter and strips ONLY the rainbow class', () => {
        let s = createInitialGameState();
        s = select(['elephant'])(s);
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'rainbow' });
        expect(s.effects.elephant.classes).toEqual(['animate-rainbow']);
        // Red potion wipes scale/filter/rainbow...
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'red' });
        expect(s.effects.elephant.scale).toBe(1);
        expect(s.effects.elephant.filter).toBe('sepia(1) saturate(5) hue-rotate(-50deg)');
        expect(s.effects.elephant.classes).toEqual([]);
        // ...and color filters replace each other instead of stacking.
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'purple' });
        expect(s.effects.elephant.filter).toBe('sepia(1) saturate(5) hue-rotate(220deg)');
    });

    it('preserves accumulated treats across potions', () => {
        let s = createInitialGameState();
        s = select(['crocodile'])(s);
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'pizza' });
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'icecream' });
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'growth' });
        expect(s.effects.crocodile.treats).toEqual(['pizza', 'icecream']);
        expect(s.effects.crocodile.scale).toBe(1.3);
    });

    it('touches ONLY selected animals', () => {
        let s = createInitialGameState();
        s = select(['orangutan'])(s);
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'hotdog' });
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'purple' });
        expect(s.effects.orangutan.filter).toBe('sepia(1) saturate(5) hue-rotate(220deg)');
        expect(s.effects.dragon).toEqual({ scale: 1, filter: '', classes: [], treats: [] });
    });

    it('sunshine filter contains "gold" (drives isSunshineGlow view)', () => {
        let s = createInitialGameState();
        s = select(['santa'])(s);
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'sunshine' });
        expect(s.effects.santa.filter.includes('gold')).toBe(true);
    });
});

/**
 * CHARACTERIZATION TESTS — Loop 3: treats, reset scope, surprise steps.
 */
describe('gameState: GIVE_TREAT details (Game.tsx handleGiveTreat)', () => {
    it('no selection => no-op returning the same state', () => {
        const s = createInitialGameState();
        const after = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'pizza' });
        expect(after).toBe(s);
    });

    it('the husky swaps a present for a bone', () => {
        let s = createInitialGameState();
        s = select(['husky'])(s);
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'present' });
        expect(s.effects.husky.treats).toEqual(['bone']);
    });

    it('every other animal keeps the present as a present', () => {
        let s = createInitialGameState();
        s = select(['husky', 'trex'])(s);
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'present' });
        expect(s.effects.husky.treats).toEqual(['bone']);
        expect(s.effects.trex.treats).toEqual(['present']);
    });

    it('giving a treat never disturbs the current visual effect', () => {
        let s = createInitialGameState();
        s = select(['dragon'])(s);
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'growth' });
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'hotdog' });
        expect(s.effects.dragon.scale).toBe(1.3);
        expect(s.effects.dragon.treats).toEqual(['hotdog']);
    });

    it('appends in order for multiple treats', () => {
        let s = createInitialGameState();
        s = select(['scorpion'])(s);
        for (const t of ['banana', 'pizza', 'bouquet'] as const) {
            s = gameReducer(s, { type: 'GIVE_TREAT', treatType: t });
        }
        expect(s.effects.scorpion.treats).toEqual(['banana', 'pizza', 'bouquet']);
    });
});

describe('gameState: RESET_SELECTED (Game.tsx handleReset)', () => {
    it('clears effects ONLY for the selected animals', () => {
        let s = createInitialGameState();
        s = select(['orangutan', 'trex'])(s);
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'growth' }); // both big
        // deselect trex, so only orangutan is targeted by the reset
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'trex' });
        s = gameReducer(s, { type: 'RESET_SELECTED' });
        expect(s.effects.orangutan).toEqual({ scale: 1, filter: '', classes: [], treats: [] });
        expect(s.effects.trex.scale).toBe(1.3); // untouched friend stays big
    });

    it('keeps the animals selected after reset (Game.tsx never clears selection)', () => {
        let s = createInitialGameState();
        s = select(['elephant'])(s);
        s = gameReducer(s, { type: 'RESET_SELECTED' });
        expect(s.selectedIds).toEqual(['elephant']);
    });

    it('SPARES accumulated treats (deliberate spec change vs legacy wipe: one tap must never destroy a toddler\'s snack pile — gameState.ts header deviation 4)', () => {
        let s = createInitialGameState();
        s = select(['crocodile'])(s);
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'pizza' });
        s = gameReducer(s, { type: 'RESET_SELECTED' });
        expect(s.effects.crocodile.treats).toEqual(['pizza']);
    });

    it('empty selection => no-op without throwing', () => {
        const s = createInitialGameState();
        const after = gameReducer(s, { type: 'RESET_SELECTED' });
        expect(after).toBe(s);
    });
});

describe('gameState: APPLY_SURPRISE_STEP (Game.tsx handleSurprise per-step setEffects)', () => {
    it('no selection => no-op returning the same state', () => {
        const s = createInitialGameState();
        const after = gameReducer(
            s,
            { type: 'APPLY_SURPRISE_STEP', scale: 1.4, filter: 'blur(3px)', classes: ['fx-dance'] }
        );
        expect(after).toBe(s);
    });

    it('overwrites scale, filter AND classes wholesale, keeping treats', () => {
        let s = createInitialGameState();
        s = select(['husky'])(s);
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'sunshine' });
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'rainbow' });
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'bone' });
        s = gameReducer(s, {
            type: 'APPLY_SURPRISE_STEP',
            scale: 0.8,
            filter: 'blur(2px) opacity(0.8)',
            classes: ['animate-float'],
        });
        expect(s.effects.husky.scale).toBe(0.8);
        expect(s.effects.husky.filter).toBe('blur(2px) opacity(0.8)');
        expect(s.effects.husky.classes).toEqual(['animate-float']);
        expect(s.effects.husky.treats).toEqual(['bone']);
    });

    it('defensively copies the incoming classes array', () => {
        let s = createInitialGameState();
        s = select(['trex'])(s);
        const classes = ['animate-float'];
        s = gameReducer(s, { type: 'APPLY_SURPRISE_STEP', scale: 1, filter: '', classes });
        classes.push('MUTATED-LATER');
        expect(s.effects.trex.classes).toEqual(['animate-float']);
    });

    it('non-rainbow classes survive a later potion (rainbow class is stripped)', () => {
        let s = createInitialGameState();
        s = select(['elephant'])(s);
        s = gameReducer(s, {
            type: 'APPLY_SURPRISE_STEP',
            scale: 2,
            filter: 'blur(2px)',
            classes: ['fx-wobble'],
        });
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'rainbow' });
        expect(s.effects.elephant.classes).toEqual(['fx-wobble', 'animate-rainbow']);
        expect(s.effects.elephant.scale).toBe(1); // potion reset wins over surprise
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'red' });
        expect(s.effects.elephant.classes).toEqual(['fx-wobble']); // rainbow stripped, wobble kept
    });
});

/**
 * NEW KID-FRIENDLY RULES — Loop 4: treat cap (FIFO).
 * Spec: MAX_TREATS_PER_ANIMAL = 8; the 9th treat drops the OLDEST.
 */
describe('gameState: kid rule — MAX_TREATS_PER_ANIMAL FIFO cap', () => {
    it('exports the cap as 8', () => {
        expect(MAX_TREATS_PER_ANIMAL).toBe(8);
    });

    it('keeps the first 8 treats untouched', () => {
        let s = createInitialGameState();
        s = select(['orangutan'])(s);
        const first8 = ['present', 'hotdog', 'banana', 'pizza', 'icecream', 'bone', 'bouquet', 'sunglasses'] as const;
        for (const t of first8) s = gameReducer(s, { type: 'GIVE_TREAT', treatType: t });
        expect(s.effects.orangutan.treats).toEqual([...first8]);
    });

    it('the 9th treat drops the oldest (FIFO), keeping the newest 8', () => {
        let s = createInitialGameState();
        s = select(['orangutan'])(s);
        const feed = ['present', 'hotdog', 'banana', 'pizza', 'icecream', 'bone', 'bouquet', 'banana'] as const;
        for (const t of feed) s = gameReducer(s, { type: 'GIVE_TREAT', treatType: t });
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'pizza' }); // 9th
        expect(s.effects.orangutan.treats).toHaveLength(MAX_TREATS_PER_ANIMAL);
        expect(s.effects.orangutan.treats[0]).toBe('hotdog'); // 'present' dropped
        expect(s.effects.orangutan.treats).not.toContain('present');
        expect(s.effects.orangutan.treats[7]).toBe('pizza'); // newest at the end
    });

    it('caps each animal independently', () => {
        let s = createInitialGameState();
        s = select(['husky', 'trex'])(s);
        for (let i = 0; i < MAX_TREATS_PER_ANIMAL; i++) {
            s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'hotdog' });
        }
        // one more for both — both were at cap, both drop their oldest
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'banana' });
        // Literal expectation (no algorithm re-implementation): 8 hotdogs then a
        // 9th banana slides the FIRST hotdog off.
        const expected = ['hotdog', 'hotdog', 'hotdog', 'hotdog', 'hotdog', 'hotdog', 'hotdog', 'banana'];
        expect(s.effects.husky.treats).toEqual(expected);
        expect(s.effects.trex.treats).toEqual(expected); // no husky special-case for hotdog
    });

    it('a husky bone counts toward the cap like any other treat', () => {
        let s = createInitialGameState();
        s = select(['husky'])(s);
        for (let i = 0; i < MAX_TREATS_PER_ANIMAL; i++) {
            s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'present' }); // stored as bone
        }
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'present' }); // 9th
        expect(s.effects.husky.treats).toHaveLength(MAX_TREATS_PER_ANIMAL);
        expect(s.effects.husky.treats.every(t => t === 'bone')).toBe(true);
    });

    it('reset keeps the queue (spec change: treats survive reset), so feeding continues from the pile', () => {
        let s = createInitialGameState();
        s = select(['dragon'])(s);
        for (let i = 0; i < MAX_TREATS_PER_ANIMAL; i++) {
            s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'banana' });
        }
        s = gameReducer(s, { type: 'RESET_SELECTED' });
        expect(s.effects.dragon.treats).toHaveLength(MAX_TREATS_PER_ANIMAL);
        // The FIFO cap still applies to NEW treats on top of the kept pile.
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'pizza' });
        expect(s.effects.dragon.treats).toHaveLength(MAX_TREATS_PER_ANIMAL);
        expect(s.effects.dragon.treats[s.effects.dragon.treats.length - 1]).toBe('pizza');
        expect(s.effects.dragon.treats[0]).toBe('banana'); // oldest banana slid off
    });
});

/**
 * Loop 5: APPLY_BREWED_EFFECT — Game.tsx handleApplyBrewedEffect +
 * potionLogic.applyBrewedEffect reuse.
 */
describe('gameState: APPLY_BREWED_EFFECT (Game.tsx handleApplyBrewedEffect)', () => {
    it('no selection => no-op returning the same state', () => {
        const s = createInitialGameState();
        const after = gameReducer(s, { type: 'APPLY_BREWED_EFFECT', primary: 'growth', intensity: 1 });
        expect(after).toBe(s);
    });

    it('growth brew scales up like applyBrewedEffect does (1 + intensity*0.3)', () => {
        let s = createInitialGameState();
        s = select(['orangutan'])(s);
        s = gameReducer(s, { type: 'APPLY_BREWED_EFFECT', primary: 'growth', intensity: 1 });
        expect(s.effects.orangutan.scale).toBeCloseTo(1.3);
        expect(s.effects.orangutan.classes).toEqual(['animate-pulse-grow']);
    });

    it('giant brew uses the same grow branch', () => {
        let s = createInitialGameState();
        s = select(['trex'])(s);
        s = gameReducer(s, { type: 'APPLY_BREWED_EFFECT', primary: 'giant', intensity: 2 });
        expect(s.effects.trex.scale).toBeCloseTo(1.6);
    });

    it('shrink brew scales down and clamps at the 0.3 floor', () => {
        let s = createInitialGameState();
        s = select(['crocodile'])(s);
        s = gameReducer(s, { type: 'APPLY_BREWED_EFFECT', primary: 'shrink', intensity: 5 });
        expect(s.effects.crocodile.scale).toBe(0.3);
        expect(s.effects.crocodile.classes).toContain('animate-shrink-bounce');
    });

    it('non-size brews keep scale 1 but take the brew filter (steam_shroud)', () => {
        let s = createInitialGameState();
        s = select(['husky'])(s);
        s = gameReducer(s, { type: 'APPLY_BREWED_EFFECT', primary: 'steam_shroud', intensity: 1 });
        expect(s.effects.husky.scale).toBe(1);
        expect(s.effects.husky.filter).toBe('blur(2px) opacity(0.8)');
    });

    it('unknown primaries fall back to the mystery visual', () => {
        let s = createInitialGameState();
        s = select(['dragon'])(s);
        s = gameReducer(s, { type: 'APPLY_BREWED_EFFECT', primary: 'totally_unknown', intensity: 1 });
        expect(s.effects.dragon.scale).toBe(1);
        expect(s.effects.dragon.filter).toBe('');
        expect(s.effects.dragon.classes).toEqual(['animate-shimmer']);
    });

    it('very intense brews add the overflow-shake class (overflowLevel > 50)', () => {
        let s = createInitialGameState();
        s = select(['scorpion'])(s);
        s = gameReducer(s, { type: 'APPLY_BREWED_EFFECT', primary: 'levitation', intensity: 2 });
        expect(s.effects.scorpion.classes).toContain('overflow-shake');
    });

    it('replaces prior visuals wholesale and preserves treats', () => {
        let s = createInitialGameState();
        s = select(['elephant'])(s);
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'sunshine' });
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'banana' });
        s = gameReducer(s, { type: 'APPLY_BREWED_EFFECT', primary: 'invisibility', intensity: 1 });
        expect(s.effects.elephant.filter).toBe('opacity(0.3)');
        expect(s.effects.elephant.scale).toBe(1);
        expect(s.effects.elephant.treats).toEqual(['banana']);
    });

    it('passes visualModifier through like legacy applyBrewedEffect(effect) did', () => {
        // Legacy Game.tsx handed the FULL BrewedEffect to applyBrewedEffect;
        // aether brews carry visualModifier 'rainbow-shimmer' which becomes a class.
        let s = createInitialGameState();
        s = select(['orangutan'])(s);
        s = gameReducer(s, {
            type: 'APPLY_BREWED_EFFECT',
            primary: 'rainbow_trail',
            intensity: 0.2,
            visualModifier: 'rainbow-shimmer',
        });
        expect(s.effects.orangutan.classes).toContain('animate-rainbow-cycle');
        expect(s.effects.orangutan.classes).toContain('rainbow-shimmer');
    });

    it('defends against non-finite intensity (treated as 0 — NaN never reaches state)', () => {
        let s = createInitialGameState();
        s = select(['trex'])(s);
        s = gameReducer(s, { type: 'APPLY_BREWED_EFFECT', primary: 'growth', intensity: NaN });
        expect(s.effects.trex.scale).toBe(1); // NOT NaN; intensity 0 -> 1 + 0*0.3
        expect(s.effects.trex.classes).not.toContain('overflow-shake');
        s = gameReducer(s, { type: 'APPLY_BREWED_EFFECT', primary: 'shrink', intensity: Infinity });
        expect(s.effects.trex.scale).toBe(1); // intensity 0 -> 1 - 0*0.3
    });
});

/**
 * Loop 5b: pure view helper replicating Game.tsx's JSX mapping rules.
 */
describe('gameState: deriveAnimalViews (Game.tsx animalStates JSX mapping)', () => {
    it('returns a neutral view for every animal when nothing has happened', () => {
        const views = deriveAnimalViews(createInitialGameState());
        expect(Object.keys(views).sort()).toEqual(ANIMALS.map(a => a.id).sort());
        for (const a of ANIMALS) {
            expect(views[a.id]).toEqual({
                scale: 1,
                filter: '',
                classes: [],
                overlayEmojis: [],
                overlayKinds: [],
                hasSunglasses: false,
                isSunshineGlow: false,
            });
        }
    });

    it.each([
        ['present', '🎁'],
        ['hotdog', '🌭'],
        ['banana', '🍌'],
        ['pizza', '🍕'],
        ['icecream', '🍦'],
        ['bone', '🦴'],
        ['bouquet', '💐'],
        ['sunglasses', '🕶️'],
    ] as const)('maps %s to emoji %s in treat order', (treat, emoji) => {
        let s = createInitialGameState();
        s = select(['trex'])(s);
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: treat });
        const view = deriveAnimalViews(s).trex;
        expect(view.overlayEmojis).toEqual([emoji]);
        expect(view.overlayKinds).toEqual([treat === 'sunglasses' ? 'sunglasses' : 'treat']);
    });

    it('stacks overlays bottom-up in the order treats were given', () => {
        let s = createInitialGameState();
        s = select(['santa'])(s);
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'pizza' });
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'icecream' });
        const view = deriveAnimalViews(s).santa;
        expect(view.overlayEmojis).toEqual(['🍕', '🍦']);
        expect(view.hasSunglasses).toBe(false);
    });

    it('flags sunglasses via kind field AND boolean', () => {
        let s = createInitialGameState();
        s = select(['husky'])(s);
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'sunglasses' });
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'bone' });
        const view = deriveAnimalViews(s).husky;
        expect(view.overlayEmojis).toEqual(['🕶️', '🦴']);
        expect(view.overlayKinds).toEqual(['sunglasses', 'treat']);
        expect(view.hasSunglasses).toBe(true);
    });

    it('the husky present-for-bone swap is visible in the view too', () => {
        let s = createInitialGameState();
        s = select(['husky'])(s);
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'present' });
        expect(deriveAnimalViews(s).husky.overlayEmojis).toEqual(['🦴']);
    });

    it('sunshine glow is detected from "gold" in the filter', () => {
        let s = createInitialGameState();
        s = select(['elephant'])(s);
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'sunshine' });
        expect(deriveAnimalViews(s).elephant.isSunshineGlow).toBe(true);
        // ...and other potions do not glow
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'red' });
        expect(deriveAnimalViews(s).elephant.isSunshineGlow).toBe(false);
    });

    it('carries scale/filter/classes through unchanged', () => {
        let s = createInitialGameState();
        s = select(['dragon'])(s);
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'rainbow' });
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'shrink' });
        const view = deriveAnimalViews(s).dragon;
        expect(view.scale).toBe(0.7);
        expect(view.filter).toBe('');
        expect(view.classes).toEqual([]); // rainbow was stripped by the shrink potion
    });

    it('hands the view its OWN copy of classes (mutating a view cannot corrupt state)', () => {
        let s = createInitialGameState();
        s = select(['dragon'])(s);
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'rainbow' });
        const view = deriveAnimalViews(s).dragon;
        view.classes.push('MUTATED-BY-VIEW');
        expect(s.effects.dragon.classes).toEqual(['animate-rainbow']);
    });
});

/**
 * buildBrew — exported so integrators can recompute overflowLevel etc. from
 * the same construction the reducer uses.
 */
describe('gameState: buildBrew', () => {
    it('produces the minimal BrewedEffect applyBrewedEffect reads', () => {
        expect(buildBrew('growth', 1, 'rainbow-shimmer')).toEqual({
            primary: 'growth',
            intensity: 1,
            duration: 0,
            frequency: 0,
            isVolatile: false,
            color: '#888888',
            visualModifier: 'rainbow-shimmer',
        });
    });

    it('omits visualModifier when not provided', () => {
        expect('visualModifier' in buildBrew('shrink', 2)).toBe(false);
    });

    it('coerces non-finite intensity to 0', () => {
        expect(buildBrew('growth', NaN).intensity).toBe(0);
        expect(buildBrew('growth', Infinity).intensity).toBe(0);
        expect(buildBrew('growth', -Infinity).intensity).toBe(0);
    });
});

describe('gameState: selectors mirroring Game.tsx header booleans', () => {
    it('hasSelection matches selectedIds.length > 0', () => {
        let s = createInitialGameState();
        expect(hasSelection(s)).toBe(false);
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'trex' });
        expect(hasSelection(s)).toBe(true);
    });

    it('isAllSelected is true only when every animal is selected', () => {
        let s = createInitialGameState();
        s = gameReducer(s, { type: 'SELECT_ALL_ANIMALS' });
        expect(isAllSelected(s)).toBe(true);
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'dragon' });
        expect(isAllSelected(s)).toBe(false);
        // The integrator reproduces handleToggleSelectAll exactly:
        if (isAllSelected(s)) s = gameReducer(s, { type: 'CLEAR_SELECTION' });
        else s = gameReducer(s, { type: 'SELECT_ALL_ANIMALS' });
        expect(s.selectedIds).toEqual(ANIMALS.map(a => a.id));
    });
});
