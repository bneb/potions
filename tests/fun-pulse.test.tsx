/**
 * FUN-TEAM round 2: tests driven by the nested red-team review.
 *
 * Covers: animal select-animation plumbing (Dragon/Elephant descendant
 * selectors), pose-hold semantics, potion keyboard access, carousel clone
 * a11y, true engine-level muting, treat-list cap, mute-button AT semantics,
 * instructional-prompt tap pass-through, celebration phantom-burst guard.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act, cleanup, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Game } from '@/components/Game/Game';
import { AnimalCarousel } from '@/components/Game/AnimalCarousel';
import { CelebrationOverlay } from '@/components/Game/CelebrationOverlay';
import { Potion } from '@/components/Game/Potion';
import { Trex } from '@/components/Game/Trex';
import { Dragon } from '@/components/Game/Dragon';
import { Elephant } from '@/components/Game/Elephant';
import { audioEngine } from '@/lib/audio/audioEngine';
import trexStyles from '@/components/Game/trex.module.css';
import dragonStyles from '@/components/Game/dragon.module.css';
import elephantStyles from '@/components/Game/elephant.module.css';

// --- Recording AudioContext (same technique as fun-ux.test.tsx) ---
interface OscRecord {
    type: string;
    freqs: number[];
}
const createdOscillators: OscRecord[] = [];

class RecordingAudioContext {
    currentTime = 0;
    state: 'running' | 'suspended' | 'closed' = 'running';
    destination = {};
    resume = vi.fn(async () => {});
    suspend = vi.fn(async () => {});
    close = vi.fn(async () => {});

    createGain() {
        return {
            connect: vi.fn(),
            disconnect: vi.fn(),
            gain: {
                value: 0,
                setValueAtTime: vi.fn(),
                linearRampToValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn(),
            },
        };
    }

    createOscillator() {
        const record: OscRecord = { type: '', freqs: [] };
        const osc = {
            connect: vi.fn(),
            disconnect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            frequency: {
                value: 0,
                setValueAtTime: vi.fn((v: number) => {
                    record.freqs.push(v);
                }),
                linearRampToValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn(),
            },
        };
        Object.defineProperty(osc, 'type', {
            set: (v: string) => {
                record.type = v;
            },
            get: () => record.type,
        });
        createdOscillators.push(record);
        return osc;
    }
}

beforeAll(() => {
    (window as unknown as { AudioContext: unknown }).AudioContext = RecordingAudioContext;
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    if (typeof window.localStorage === 'undefined') {
        const store = new Map<string, string>();
        const shim: Storage = {
            get length() {
                return store.size;
            },
            clear: () => store.clear(),
            getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
            key: (i: number) => Array.from(store.keys())[i] ?? null,
            removeItem: (k: string) => void store.delete(k),
            setItem: (k: string, v: string) => void store.set(k, String(v)),
        };
        Object.defineProperty(window, 'localStorage', { value: shim, configurable: true });
    }
});

beforeEach(() => {
    createdOscillators.length = 0;
    window.localStorage.clear();
});

afterEach(() => {
    // Never leak the engine-wide mute into another test.
    (audioEngine as unknown as { setMuted?: (m: boolean) => void }).setMuted?.(false);
    cleanup();
});

function overrideMatchMedia(initialMatches: boolean) {
    const listeners = new Set<(e: { matches: boolean }) => void>();
    let current = initialMatches;
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
        // Stateful like a real MediaQueryList: firing a change updates what
        // every future .matches read returns.
        get matches() {
            return current;
        },
        media: query,
        onchange: null,
        addEventListener: (_t: string, l: (e: { matches: boolean }) => void) => {
            listeners.add(l);
        },
        removeEventListener: (_t: string, l: (e: { matches: boolean }) => void) => {
            listeners.delete(l);
        },
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
    })) as unknown as typeof window.matchMedia;
    return {
        listeners,
        fire(matches: boolean) {
            current = matches;
            listeners.forEach((l) => l({ matches }));
        },
        restore: () => { window.matchMedia = original; },
    };
}

// ===========================================================================
// Red-team finding 1: Dragon & Elephant select animations were dead code
// (.selected .dragon requires an ANCESTOR carrying .selected).
// ===========================================================================
describe('animal pulse plumbing reaches the CSS', () => {
    it('Dragon puts the pulse class on an ancestor of the dragon rig', () => {
        const { container } = render(<Dragon pulse="in" />);
        const rig = container.querySelector(`.${dragonStyles.dragon}`);
        expect(rig).not.toBeNull();
        // `.selected .dragon` is a descendant selector: carrying the class on
        // the rig ITSELF never matches. A strict ancestor must carry it.
        expect(rig!.parentElement?.closest(`.${dragonStyles.selected}`)).not.toBeNull();
    });

    it('Dragon puts the deselected class on an ancestor too', () => {
        const { container } = render(<Dragon pulse="out" />);
        const rig = container.querySelector(`.${dragonStyles.dragon}`);
        expect(rig).not.toBeNull();
        expect(rig!.parentElement?.closest(`.${dragonStyles.unselected}`)).not.toBeNull();
    });

    it('Elephant puts the pulse class on an ancestor of the elephant rig', () => {
        const { container } = render(<Elephant pulse="in" />);
        const rig = container.querySelector(`.${elephantStyles.elephant}`);
        expect(rig).not.toBeNull();
        expect(rig!.parentElement?.closest(`.${elephantStyles.selected}`)).not.toBeNull();
    });

    it('Trex keeps its working flat-class behaviour (regression pin)', () => {
        const { container } = render(<Trex pulse="in" />);
        const rig = container.querySelector(`.${trexStyles.dinoRig}`);
        expect(rig).not.toBeNull();
        expect(rig!.className).toContain(trexStyles.selected);
    });
});

// ===========================================================================
// Red-team finding 4: poses must not snap back on unrelated taps.
// While an animal stays selected, its select animation class must persist.
// ===========================================================================
describe('carousel holds the select pose while a friend stays selected', () => {
    const noop = () => {};

    function renderAt(props: {
        selectedIds: string[];
        pulse: { epoch: number; added: string[]; removed: string[] };
    }) {
        return render(
            <AnimalCarousel
                selectedIds={props.selectedIds as never}
                onSelect={noop}
                animalStates={{}}
                selectionPulse={props.pulse as never}
            />,
        );
    }

    function trexCard(container: HTMLElement): HTMLElement {
        const card = container.querySelector('[data-testid="animal-card-trex"]');
        expect(card).not.toBeNull();
        return card as HTMLElement;
    }

    it('an unrelated selection change keeps the selected pose on Trex', () => {
        const view = renderAt({ selectedIds: ['trex'], pulse: { epoch: 1, added: ['trex'], removed: [] } });
        expect(trexCard(view.container).querySelector(`.${trexStyles.selected}`)).not.toBeNull();

        // Someone else gets tapped — Trex must NOT lose his pose.
        view.rerender(
            <AnimalCarousel
                selectedIds={['trex', 'dragon'] as never}
                onSelect={noop}
                animalStates={{}}
                selectionPulse={{ epoch: 2, added: ['dragon'], removed: [] }}
            />,
        );
        expect(trexCard(view.container).querySelector(`.${trexStyles.selected}`)).not.toBeNull();

        // Deselecting Trex plays the exit animation…
        view.rerender(
            <AnimalCarousel
                selectedIds={['dragon'] as never}
                onSelect={noop}
                animalStates={{}}
                selectionPulse={{ epoch: 3, added: [], removed: ['trex'] }}
            />,
        );
        expect(trexCard(view.container).querySelector(`.${trexStyles.unselected}`)).not.toBeNull();

        // …and a later unrelated change may drop the finished exit class.
        view.rerender(
            <AnimalCarousel
                selectedIds={['dragon'] as never}
                onSelect={noop}
                animalStates={{}}
                selectionPulse={{ epoch: 4, added: ['santa'], removed: [] }}
            />,
        );
        expect(trexCard(view.container).querySelector(`.${trexStyles.unselected}`)).toBeNull();
    });
});

// ===========================================================================
// Red-team finding 8a: potions must respond to Enter/Space like real buttons.
// ===========================================================================
describe('potion keyboard access', () => {
    it('activates on Enter and Space', () => {
        const onClick = vi.fn();
        render(<Potion type="growth" label="Growth Potion" onClick={onClick} />);
        const el = screen.getByRole('button', { name: /growth potion/i });
        el.focus();
        fireEvent.keyDown(el, { key: 'Enter' });
        fireEvent.keyDown(el, { key: ' ' });
        expect(onClick).toHaveBeenCalledTimes(2);
    });
});

// ===========================================================================
// Red-team finding 8b: carousel clones should be invisible to AT and Tab.
// ===========================================================================
describe('carousel clone accessibility', () => {
    it('renders exactly ONE screen-reader-visible button per animal (middle set)', () => {
        const { container } = render(
            <AnimalCarousel selectedIds={[]} onSelect={() => {}} animalStates={{}} />,
        );
        // 8 animals × 3 clone sets exist in the DOM…
        expect(container.querySelectorAll('button[aria-pressed]').length).toBe(24);
        // …but only the middle set is announced/focusable.
        expect(screen.getAllByRole('button', { name: /t-rex/i })).toHaveLength(1);

        const visibleCard = screen.getByRole('button', { name: /t-rex/i });
        expect(visibleCard).not.toHaveAttribute('aria-hidden', 'true');

        const hiddenCards = container.querySelectorAll('button[aria-pressed][aria-hidden="true"]');
        expect(hiddenCards.length).toBe(16);
        hiddenCards.forEach((c) => expect(c).toHaveAttribute('tabindex', '-1'));
    });
});

// ===========================================================================
// Red-team finding 5: muting must truly silence engine-side sounds
// (e.g. the sorcerer, who plays through the engine, not through Game).
// ===========================================================================
describe('engine-level muting', () => {
    it('with sounds muted, the sorcerer produces zero oscillators', async () => {
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getByRole('button', { name: /turn sounds off/i }));

        createdOscillators.length = 0;
        await user.click(screen.getByRole('button', { name: /magic wand/i }));
        expect(createdOscillators.length).toBe(0);
    });
});

// ===========================================================================
// Red-team finding 3 (perf/leak): treat overlays must be capped per animal.
// ===========================================================================
describe('treat overlay growth is capped', () => {
    it('spamming treats never stacks more than 6 emojis per animal', async () => {
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getAllByRole('button', { name: /t-rex/i })[0]);

        for (let i = 0; i < 10; i++) {
            await user.click(screen.getByRole('button', { name: /hotdog/i }));
        }

        const card = screen.getAllByRole('button', { name: /t-rex/i })[0];
        const hotdogs = within(card).queryAllByText('🌭');
        expect(hotdogs.length).toBeGreaterThan(0);
        expect(hotdogs.length).toBeLessThanOrEqual(6);
    });
});

// ===========================================================================
// Red-team finding 10: the mute button must not double-signal state to AT.
// ===========================================================================
describe('mute button AT semantics', () => {
    it('signals state via label only — no aria-pressed contradiction', async () => {
        const user = userEvent.setup();
        render(<Game />);
        const btn = screen.getByRole('button', { name: /turn sounds off/i });
        expect(btn).not.toHaveAttribute('aria-pressed');
        await user.click(btn);
        expect(screen.getByRole('button', { name: /turn sounds on/i })).not.toHaveAttribute('aria-pressed');
    });
});

// ===========================================================================
// Red-team finding 9c: the instructional overlay must not swallow the kid's
// first "tap a friend" tap — only its own card intercepts pointers.
// ===========================================================================
describe('instructional prompt passes taps through', () => {
    it('overlay lets pointers through; only the instruction card catches them', () => {
        vi.useFakeTimers();
        try {
            render(<Game />);
            act(() => {
                vi.advanceTimersByTime(2200);
            });
            const overlay = screen.getByTestId('instructional-overlay');
            expect(overlay).toHaveStyle({ 'pointer-events': 'none' });
            const card = screen.getByTestId('instructional-card');
            expect(card).toHaveStyle({ 'pointer-events': 'auto' });
        } finally {
            vi.useRealTimers();
        }
    });
});

// ===========================================================================
// Red-team finding 3: flipping reduced-motion mid-session must not conjure a
// phantom celebration burst for an epoch that already celebrated.
// ===========================================================================
describe('celebration phantom burst guard', () => {
    it('changing the motion preference does not spawn extra particles', () => {
        const mm = overrideMatchMedia(false);
        try {
            const view = render(<CelebrationOverlay burst={{ epoch: 7, magnitude: 1 }} />);
            const initial = document.querySelectorAll('[data-testid="celebration-particle"]').length;
            expect(initial).toBeGreaterThan(0);

            // User flips their OS setting mid-session:
            act(() => {
                mm.fire(true);
            });

            const after = document.querySelectorAll('[data-testid="celebration-particle"]').length;
            expect(after).toBe(initial);
            view.unmount();
        } finally {
            mm.restore();
        }
    });
});
