import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Game } from '@/components/Game/Game';

/**
 * INTEGRATION: the wired component must expose the pure brain's contracts in
 * the DOM. These run against the real Game component tree.
 */

beforeEach(() => {
    window.localStorage.clear();
});

afterEach(() => {
    cleanup();
});

describe('integration: treats survive potions on screen', () => {
    it('a banana stays visible after a growth potion lands', async () => {
        const user = userEvent.setup();
        render(<Game />);

        // Select T-Rex directly.
        await user.click(screen.getAllByRole('button', { name: /t-rex/i })[0]);

        // Give a banana, then grow.
        await user.click(screen.getByRole('button', { name: /banana/i }));
        await user.click(screen.getByRole('button', { name: /growth/i }));

        const card = screen.getAllByRole('button', { name: /t-rex/i })[0];

        // The treat overlay survived the potion...
        expect(within(card).getByText('🍌')).toBeInTheDocument();

        // ...and the growth scale is applied to the animal wrapper.
        const scaled = Array.from(card.querySelectorAll<HTMLElement>('div'))
            .some(d => d.style.transform === 'scale(1.3)');
        expect(scaled).toBe(true);
    });

    it('auto-select-all then potion applies the effect (zero dead ends)', async () => {
        const user = userEvent.setup();
        render(<Game />);

        // No selection: tapping a potion must adopt all friends and apply.
        await user.click(screen.getByRole('button', { name: /shrink/i }));

        expect(screen.getByText(/8 friends are ready/i)).toBeInTheDocument();

        // Every t-rex strip copy shows the shrink scale (0.7).
        const cards = screen.getAllByRole('button', { name: /t-rex/i });
        const shrunk = cards.filter(card =>
            Array.from(card.querySelectorAll<HTMLElement>('div'))
                .some(d => d.style.transform === 'scale(0.7)')
        );
        expect(shrunk.length).toBe(cards.length);
    });
});
