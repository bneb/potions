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
