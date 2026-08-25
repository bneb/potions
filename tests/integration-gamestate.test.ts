import { describe, it, expect } from 'vitest';
import {
    createInitialGameState,
    gameReducer,
    deriveAnimalViews,
    MAX_VISIBLE_TREATS,
} from '@/lib/gameState';
import type { GamePhaseState } from '@/lib/gameState';

/**
 * INTEGRATION CONTRACTS between the pure brain (gameState) and the component
 * layer. These pin the behavior the wired Game.tsx must expose.
 */

describe('integration: view-layer treat cap', () => {
    it('exposes MAX_VISIBLE_TREATS = 6 (visual clutter bound for toddlers)', () => {
        expect(MAX_VISIBLE_TREATS).toBe(6);
    });

    it('deriveAnimalViews shows at most the last 6 treats even when state holds 8', () => {
        let s: GamePhaseState = createInitialGameState();
        s = gameReducer(s, { type: 'SELECT_ALL_ANIMALS' });
        const feast = ['present', 'hotdog', 'banana', 'pizza', 'icecream', 'bone', 'bouquet', 'sunglasses'] as const;
        for (const t of feast) {
            s = gameReducer(s, { type: 'GIVE_TREAT', treatType: t });
        }
        // State keeps the FIFO-capped pile of 8...
        expect(s.effects.dragon.treats).toHaveLength(8);
        // ...but the VIEW shows only the newest 6 (oldest two slide off screen).
        const view = deriveAnimalViews(s).dragon;
        expect(view.overlayEmojis).toHaveLength(6);
        expect(view.overlayEmojis).toEqual(['🍌', '🍕', '🍦', '🦴', '💐', '🕶️']);
        expect(view.overlayKinds[view.overlayKinds.length - 1]).toBe('sunglasses');
    });
});

describe('integration: treats survive potions (pure contract behind the UI)', () => {
    it('applying a potion after treats keeps every treat', () => {
        let s: GamePhaseState = createInitialGameState();
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'trex' });
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'banana' });
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'growth' });
        const view = deriveAnimalViews(s).trex;
        expect(view.scale).toBe(1.3);
        expect(view.overlayEmojis).toEqual(['🍌']);
    });
});

describe('integration: surprise cascade freezes its cast (frozen-target semantics)', () => {
    const STEP = { scale: 1.35, filter: '', classes: ['animate-pulse-grow'] };

    it('explicit targetIds apply even when live selection has moved on', () => {
        let s: GamePhaseState = createInitialGameState();
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'trex' });
        // Mid-cascade the kid taps crocodile: selection follows their finger...
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'crocodile' });
        // ...but the dancing spell keeps its original cast.
        s = gameReducer(s, { type: 'APPLY_SURPRISE_STEP', ...STEP, targetIds: ['trex'] });
        expect(s.effects.trex.scale).toBe(1.35);
        expect(s.effects.crocodile.scale).toBe(1); // bystander stays neutral
    });

    it('a cleared selection cannot kill the remaining cascade steps', () => {
        let s: GamePhaseState = createInitialGameState();
        s = gameReducer(s, { type: 'SELECT_ALL_ANIMALS' });
        s = gameReducer(s, { type: 'CLEAR_SELECTION' });
        s = gameReducer(s, { type: 'APPLY_SURPRISE_STEP', ...STEP, targetIds: ['husky'] });
        expect(s.effects.husky.scale).toBe(1.35);
    });

    it('without targetIds, steps follow the live selection (legacy default)', () => {
        let s: GamePhaseState = createInitialGameState();
        s = gameReducer(s, { type: 'SELECT_ALL_ANIMALS' });
        s = gameReducer(s, { type: 'APPLY_SURPRISE_STEP', ...STEP });
        expect(s.effects.dragon.scale).toBe(1.35);
    });
});

describe('integration: reset is visual-only (treats are keepsaes)', () => {
    it('RESET_SELECTED restores the body but spares the treat pile', () => {
        let s: GamePhaseState = createInitialGameState();
        s = gameReducer(s, { type: 'TOGGLE_SELECT_ANIMAL', id: 'dragon' });
        s = gameReducer(s, { type: 'GIVE_TREAT', treatType: 'pizza' });
        s = gameReducer(s, { type: 'APPLY_POTION', potionType: 'rainbow' });
        s = gameReducer(s, { type: 'RESET_SELECTED' });

        const view = deriveAnimalViews(s).dragon;
        expect(view.scale).toBe(1);
        expect(view.filter).toBe('');
        expect(view.classes).toHaveLength(0);
        // Minutes of collected pizza survive a tap-happy Reset.
        expect(view.overlayEmojis).toEqual(['🍕']);
    });
});
