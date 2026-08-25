import { AnimalId, PotionType, TreatType, BrewedEffect } from './schemas';
import { ANIMALS } from './data';
import { applyBrewedEffect } from './potionLogic';

/**
 * gameState — the pure, headless brain of Magic Potions.
 *
 * Zero React / DOM / audio dependencies: the behavior here is a faithful
 * extraction of app/components/Game/Game.tsx's state-update logic so it can
 * be exhaustively unit-tested (and benchmarked) without a browser.
 *
 * Two documented, intentional deviations from a byte-level component port,
 * plus two deliberate product improvements over legacy (test-pinned):
 *  1. EMPTY SELECTION = QUIET NO-OP for every applying action. The reducer is
 *     a policy-free brain: whether tapping an action with no friend selected
 *     should auto-select everyone first ("zero dead ends") is a COMPONENT
 *     decision — dispatch SELECT_ALL_ANIMALS before the action if desired.
 *  2. effects is a TOTAL Record and RESET_SELECTED neutralizes entries to
 *     NEUTRAL_EFFECT() instead of deleting keys (legacy `delete updated[id]`).
 *     Views are identical either way via deriveAnimalViews' missing-entry
 *     fallback; total records keep the public type honest.
 *  3. TREATS FIFO-CAP at MAX_TREATS_PER_ANIMAL (legacy piles grew unbounded).
 *     Invisible past the cap because views render the newest
 *     MAX_VISIBLE_TREATS only.
 *  4. RESET_SELECTED SPARES THE TREAT PILE (legacy wiped everything). One tap
 *     must never destroy minutes of collected snacks; Reset means "back to
 *     normal", not "take your toys away". Surprise steps accept a frozen
 *     targetIds cast so mid-cascade taps can't strand the magic.
 */

// === STATE TYPES ===

export interface AnimalEffectState {
    scale: number;
    filter: string;
    classes: string[];
    treats: TreatType[];
}

export interface GamePhaseState {
    selectedIds: AnimalId[];
    effects: Record<AnimalId, AnimalEffectState>;
}

// === CONSTANTS ===

/** A animal friend never holds more than this many treats (FIFO overflow). */
export const MAX_TREATS_PER_ANIMAL = 8;

/**
 * How many treat emojis the VIEW renders per animal. The state may hold up to
 * MAX_TREATS_PER_ANIMAL, but the screen shows only the newest
 * MAX_VISIBLE_TREATS — a pile big enough to feel rewarding, small enough to
 * stay uncluttered (and cheap to paint) on a kid's tablet.
 */
export const MAX_VISIBLE_TREATS = 6;

// === ACTIONS ===

export type GameAction =
    | { type: 'TOGGLE_SELECT_ANIMAL'; id: AnimalId }
    | { type: 'SELECT_ALL_ANIMALS' }
    | { type: 'CLEAR_SELECTION' }
    | { type: 'APPLY_POTION'; potionType: PotionType }
    | { type: 'GIVE_TREAT'; treatType: TreatType }
    | { type: 'RESET_SELECTED' }
    | {
        type: 'APPLY_SURPRISE_STEP';
        scale: number;
        filter: string;
        classes: string[];
        /**
         * Frozen cast for this step (legacy Surprise semantics). The component
         * snapshots its targets ONCE when Surprise is tapped and passes them
         * here, so a kid re-choosing friends mid-cascade can't freeze their
         * dancing friend or kill the remaining steps. Omit to follow the live
         * selection instead.
         */
        targetIds?: AnimalId[];
    }
    | {
        type: 'APPLY_BREWED_EFFECT';
        primary: string;
        intensity: number;
        /** Aether brews carry 'rainbow-shimmer'; legacy passed the full effect. */
        visualModifier?: string;
    };

// === FACTORY ===

export function createInitialGameState(): GamePhaseState {
    const effects = Object.fromEntries(
        ANIMALS.map(a => [a.id, NEUTRAL_EFFECT()])
    ) as Record<AnimalId, AnimalEffectState>;
    return { selectedIds: [], effects };
}

/**
 * Builds the minimal BrewedEffect that potionLogic.applyBrewedEffect actually
 * reads (primary, intensity, visualModifier). Non-finite intensities (NaN /
 * ±Infinity from bad lab math) are coerced to 0 so clamps can never leak NaN
 * into a kid's screen. Single choke point for the reducer AND for integrators
 * who need to recompute overflowLevel.
 */
export function buildBrew(primary: string, intensity: number, visualModifier?: string): BrewedEffect {
    return {
        primary,
        intensity: Number.isFinite(intensity) ? intensity : 0,
        duration: 0,
        frequency: 0,
        isVolatile: false,
        color: '#888888',
        ...(visualModifier ? { visualModifier } : {}),
    };
}

// === REDUCER ===

const NEUTRAL_EFFECT = (): AnimalEffectState => ({
    scale: 1,
    filter: '',
    classes: [],
    treats: [],
});

export function gameReducer(state: GamePhaseState, action: GameAction): GamePhaseState {
    switch (action.type) {
        case 'TOGGLE_SELECT_ANIMAL': {
            // Game.tsx handleSelect: remove if present, else append at the end.
            // A toggle always changes membership, so a fresh array is returned.
            const next = state.selectedIds.includes(action.id)
                ? state.selectedIds.filter(id => id !== action.id)
                : [...state.selectedIds, action.id];
            return { ...state, selectedIds: next };
        }

        case 'SELECT_ALL_ANIMALS': {
            // Game.tsx handleToggleSelectAll (select branch): canonical order.
            const all = ANIMALS.map(a => a.id);
            return { ...state, selectedIds: [...all] };
        }

        case 'CLEAR_SELECTION':
            if (state.selectedIds.length === 0) return state;
            return { ...state, selectedIds: [] };

        case 'GIVE_TREAT': {
            // Game.tsx handleGiveTreat: no selection => quiet no-op.
            if (state.selectedIds.length === 0) return state;
            const effects = { ...state.effects };
            for (const id of state.selectedIds) {
                const current = effects[id] ?? NEUTRAL_EFFECT();
                // The husky always unwraps a present as a bone.
                const finalType =
                    action.treatType === 'present' && id === 'husky'
                        ? 'bone'
                        : action.treatType;
                effects[id] = {
                    ...current,
                    // Kid-friendly cap: never more than MAX_TREATS_PER_ANIMAL
                    // snacks on screen — the oldest one slides off (FIFO).
                    treats: [...current.treats, finalType].slice(-MAX_TREATS_PER_ANIMAL),
                };
            }
            return { ...state, effects };
        }

        case 'RESET_SELECTED': {
            // No selection => quiet no-op; selection is KEPT.
            // DEVIATIONS (documented in header): legacy `delete updated[id]`
            // becomes neutralization (total Record), and — a deliberate
            // product improvement over legacy — the treat PILE survives:
            // Reset restores the body (scale/filter/classes) but a toddler's
            // collected snacks are never destroyed by one tap.
            if (state.selectedIds.length === 0) return state;
            const effects = { ...state.effects };
            for (const id of state.selectedIds) {
                const current = effects[id] ?? NEUTRAL_EFFECT();
                effects[id] = {
                    ...NEUTRAL_EFFECT(),
                    treats: current.treats,
                };
            }
            return { ...state, effects };
        }

        case 'APPLY_SURPRISE_STEP': {
            // Per-step overwrite of everything visual, keep treats. Targets
            // are the frozen cast when provided, else the live selection
            // (legacy default). Empty targets => quiet no-op.
            const ids = action.targetIds ?? state.selectedIds;
            if (ids.length === 0) return state;
            const effects = { ...state.effects };
            for (const id of ids) {
                const current = effects[id] ?? NEUTRAL_EFFECT();
                effects[id] = {
                    ...current,
                    scale: action.scale,
                    filter: action.filter,
                    classes: [...action.classes],
                };
            }
            return { ...state, effects };
        }

        case 'APPLY_POTION': {
            // Game.tsx handleUsePotion: no selection => quiet no-op.
            if (state.selectedIds.length === 0) return state;
            const effects = { ...state.effects };
            for (const id of state.selectedIds) {
                const next = { ...(effects[id] ?? NEUTRAL_EFFECT()) };
                // First wipe any prior visual effect...
                next.scale = 1;
                next.filter = '';
                next.classes = next.classes.filter(c => c !== 'animate-rainbow');
                // ...then layer the new potion on top.
                switch (action.potionType) {
                    case 'growth': next.scale = 1.3; break;
                    case 'shrink': next.scale = 0.7; break;
                    case 'red': next.filter = 'sepia(1) saturate(5) hue-rotate(-50deg)'; break;
                    case 'purple': next.filter = 'sepia(1) saturate(5) hue-rotate(220deg)'; break;
                    case 'rainbow': next.classes.push('animate-rainbow'); break;
                    case 'sunshine':
                        next.filter = 'sepia(1) saturate(10) hue-rotate(0deg) drop-shadow(0 0 15px gold)';
                        break;
                }
                effects[id] = next;
            }
            return { ...state, effects };
        }

        case 'APPLY_BREWED_EFFECT': {
            // Game.tsx handleApplyBrewedEffect: no selection => quiet no-op.
            if (state.selectedIds.length === 0) return state;
            const effectState = applyBrewedEffect(
                buildBrew(action.primary, action.intensity, action.visualModifier)
            );
            const effects = { ...state.effects };
            for (const id of state.selectedIds) {
                const current = effects[id] ?? NEUTRAL_EFFECT();
                effects[id] = {
                    ...current,
                    scale: effectState.scale,
                    filter: effectState.filter,
                    classes: [...effectState.classes],
                };
            }
            return { ...state, effects };
        }

        default:
            return state;
    }
}

// === SELECTORS (Game.tsx header booleans) ===

export function hasSelection(state: GamePhaseState): boolean {
    return state.selectedIds.length > 0;
}

export function isAllSelected(state: GamePhaseState): boolean {
    // Parity with the (hardened) component check: length equal AND non-empty.
    return state.selectedIds.length === ANIMALS.length && state.selectedIds.length > 0;
}

// === PURE VIEW HELPERS (Game.tsx animalStates JSX mapping) ===

/** Treat -> overlay emoji, exactly the ternary chain in Game.tsx's JSX. */
export const TREAT_EMOJIS: Record<TreatType, string> = {
    hotdog: '🌭',
    present: '🎁',
    banana: '🍌',
    pizza: '🍕',
    icecream: '🍦',
    bone: '🦴',
    bouquet: '💐',
    sunglasses: '🕶️',
};

const FALLBACK_TREAT_EMOJI = '🎁';

export type OverlayKind = 'treat' | 'sunglasses';

export interface AnimalView {
    scale: number;
    filter: string;
    classes: string[];
    /** Emoji per treat, in the order treats were given. */
    overlayEmojis: string[];
    /** Parallel to overlayEmojis: sunglasses render at the top of the animal. */
    overlayKinds: OverlayKind[];
    /** Convenience flag: any sunglasses overlay present? */
    hasSunglasses: boolean;
    /** Game.tsx: sunshine glow overlay when the filter contains 'gold'. */
    isSunshineGlow: boolean;
}

/**
 * Derives everything a view component needs per animal — the pure twin of
 * the `ANIMALS.forEach` block that builds `animalStates` in Game.tsx.
 * Index i of overlayEmojis/overlayKinds corresponds to treat i; components
 * reuse the index for the stagger delay (i * 0.1s) and fan-out offset.
 */
export function deriveAnimalViews(state: GamePhaseState): Record<AnimalId, AnimalView> {
    const views = {} as Record<AnimalId, AnimalView>; // populated for every ANIMAL below
    for (const a of ANIMALS) {
        const data = state.effects[a.id];
        if (!data) {
            views[a.id] = {
                scale: 1,
                filter: '',
                classes: [],
                overlayEmojis: [],
                overlayKinds: [],
                hasSunglasses: false,
                isSunshineGlow: false,
            };
            continue;
        }
        const overlayEmojis: string[] = [];
        const overlayKinds: OverlayKind[] = [];
        let hasSunglasses = false;
        // View cap: only the newest MAX_VISIBLE_TREATS emojis reach the screen
        // (state may retain more — see MAX_VISIBLE_TREATS).
        const visibleTreats = data.treats.slice(-MAX_VISIBLE_TREATS);
        for (const t of visibleTreats) {
            overlayEmojis.push(TREAT_EMOJIS[t] ?? FALLBACK_TREAT_EMOJI);
            const isSunglasses = t === 'sunglasses';
            overlayKinds.push(isSunglasses ? 'sunglasses' : 'treat');
            if (isSunglasses) hasSunglasses = true;
        }
        views[a.id] = {
            scale: data.scale,
            filter: data.filter,
            // Own copy: mutating a view must never corrupt game state.
            classes: [...data.classes],
            overlayEmojis,
            overlayKinds,
            hasSunglasses,
            isSunshineGlow: data.filter.includes('gold'),
        };
    }
    return views;
}
