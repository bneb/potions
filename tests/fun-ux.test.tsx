/**
 * FUN-TEAM acceptance tests: zero dead ends, instant feedback, toddler
 * ergonomics, parent sound toggle, celebration juice, reduced motion.
 *
 * A recording Web Audio context is installed BEFORE any component renders so
 * assertions can inspect exactly which oscillators the game created. The harsh
 * error buzz is a 150 Hz square wave (see audioEngine.playError) — several
 * tests assert it is NEVER created on a child-facing path.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act, renderHook, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Game } from '@/components/Game/Game';
import { CelebrationOverlay } from '@/components/Game/CelebrationOverlay';
import { IridescentBackground } from '@/components/Game/IridescentBackground';
import { usePrefersReducedMotion } from '@/components/Game/usePrefersReducedMotion';
import { audioEngine } from '@/lib/audio/audioEngine';

// ---------------------------------------------------------------------------
// Recording AudioContext (overrides the setup.ts mock for this file only)
// ---------------------------------------------------------------------------
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

    // React 19 act() support (RTL cannot auto-configure it because this
    // project runs Vitest without `globals: true`).
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    // This jsdom build does not wire localStorage onto window. Install a tiny
    // in-memory shim so persistence behaviour is exercisable end-to-end.
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
});

afterEach(() => {
    cleanup();
});

/** True if the harsh error buzz (square wave at ~150 Hz) was played. */
function sawErrorBuzz(): boolean {
    return createdOscillators.some((o) => o.type === 'square' && o.freqs.includes(150));
}

// ---------------------------------------------------------------------------
// matchMedia override helper for reduced-motion branches
// ---------------------------------------------------------------------------
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
        addEventListener: (_type: string, listener: (e: { matches: boolean }) => void) => {
            listeners.add(listener);
        },
        removeEventListener: (_type: string, listener: (e: { matches: boolean }) => void) => {
            listeners.delete(listener);
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
// R1 — ZERO DEAD ENDS
// ===========================================================================
describe('R1: zero dead ends — tapping with nothing selected auto-selects all friends', () => {
    it('tapping a potion with nothing selected selects every friend, plays happy sounds, never the error buzz', async () => {
        const user = userEvent.setup();
        render(<Game />);
        expect(screen.queryByText(/friends are ready/i)).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /growth potion/i }));

        // Auto-selected ALL friends, announced in friendly status text.
        expect(await screen.findByText(/8 friends are ready/i)).toBeInTheDocument();
        // Happy-path audio happened…
        expect(createdOscillators.length).toBeGreaterThan(0);
        // …and the harsh error buzz did NOT.
        expect(sawErrorBuzz()).toBe(false);
    });

    it('tapping a treat with nothing selected auto-selects and feeds everyone', async () => {
        const user = userEvent.setup();
        render(<Game />);

        await user.click(screen.getByRole('button', { name: /hotdog/i }));

        expect(await screen.findByText(/8 friends are ready/i)).toBeInTheDocument();
        expect(createdOscillators.length).toBeGreaterThan(0);
        expect(sawErrorBuzz()).toBe(false);
    });

    it('tapping Surprise! with nothing selected auto-selects and starts the magic walk', async () => {
        vi.useFakeTimers();
        try {
            render(<Game />);
            // fireEvent (not user-event): synchronous dispatch plays nicely
            // with fake timers.
            fireEvent.click(screen.getByRole('button', { name: /surprise/i }));

            expect(screen.getByText(/8 friends are ready/i)).toBeInTheDocument();

            // Let the whole Markov walk play out without errors.
            await act(async () => {
                await vi.advanceTimersByTimeAsync(4000);
            });
            expect(createdOscillators.length).toBeGreaterThan(0);
            expect(sawErrorBuzz()).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });

    it('tapping Reset with nothing selected stays gentle: pop sound, no crash, no error buzz', async () => {
        const user = userEvent.setup();
        render(<Game />);

        await user.click(screen.getByRole('button', { name: /reset/i }));

        expect(createdOscillators.length).toBeGreaterThan(0);
        expect(sawErrorBuzz()).toBe(false);
    });

    it('shelves are never disabled for little fingers (no visual dead ends)', () => {
        render(<Game />);
        expect(screen.getByRole('button', { name: /growth potion/i })).not.toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('button', { name: /hotdog/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /surprise/i })).toBeEnabled();
    });
});

// ===========================================================================
// R2 — INSTANT FEEDBACK
// ===========================================================================
describe('R2: tapping a friend gives instant, visible selected feedback', () => {
    it('animal cards are real buttons with aria-pressed toggling', async () => {
        const user = userEvent.setup();
        render(<Game />);

        const trexCards = screen.getAllByRole('button', { name: /t-rex/i });
        expect(trexCards.length).toBeGreaterThan(0);
        expect(trexCards[0]).toHaveAttribute('aria-pressed', 'false');

        await user.click(trexCards[0]);
        expect(trexCards[0]).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText(/T-Rex is ready/i)).toBeInTheDocument();

        // Friends not tapped stay unselected.
        expect(screen.getAllByRole('button', { name: /dragon/i })[0]).toHaveAttribute('aria-pressed', 'false');

        // Tapping again deselects.
        await user.click(trexCards[0]);
        expect(trexCards[0]).toHaveAttribute('aria-pressed', 'false');
    });

    it('selected cards show the tap bounce animation class immediately on tap', async () => {
        const user = userEvent.setup();
        render(<Game />);
        const dragon = screen.getAllByRole('button', { name: /dragon/i })[0];

        await user.click(dragon);

        const bouncing = document.querySelectorAll('.animal-tap-bounce');
        expect(bouncing.length).toBeGreaterThan(0);
    });
});

// ===========================================================================
// R3 — TODDLER ERGONOMICS
// ===========================================================================
describe('R3: toddler ergonomics', () => {
    it('game surface kills accidental gestures (touch-action, user-select)', () => {
        const { container } = render(<Game />);
        const surface = container.firstElementChild as HTMLElement;
        expect(surface).toHaveAttribute('data-game-surface');
        expect(surface).toHaveStyle({ 'touch-action': 'manipulation' });
        expect(surface).toHaveStyle({ 'user-select': 'none' });
    });

    it('header controls use the big-kid button class backed by ≥64px CSS', () => {
        render(<Game />);
        for (const name of [/classic/i, /select all/i, /reset/i, /surprise/i]) {
            const btn = screen.getByRole('button', { name });
            expect(btn.className).toContain('btn-kid');
        }
        const globalsCss = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');
        expect(globalsCss).toMatch(/\.btn-kid\s*\{[^}]*min-height:\s*64px/);
        expect(globalsCss).toMatch(/\.touch-target\s*\{[^}]*min-height:\s*64px/);
        expect(globalsCss).toMatch(/touch-action:\s*manipulation/);
        expect(globalsCss).toMatch(/-webkit-tap-highlight-color:\s*transparent/);
    });

    it('layout viewport locks zoom (maximum-scale=1, user-scalable=no)', () => {
        const layoutSource = readFileSync(resolve(process.cwd(), 'app/layout.tsx'), 'utf8');
        expect(layoutSource).toMatch(/maximumScale:\s*1/);
        expect(layoutSource).toMatch(/userScalable:\s*false/);
    });
});

// ===========================================================================
// R4 — PARENT SOUND TOGGLE
// ===========================================================================
describe('R4: parent sound toggle', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('header button flips 🔊/🔇, persists to localStorage, and calls engine setMuted defensively', async () => {
        const user = userEvent.setup();
        const setMuted = vi.fn();
        (audioEngine as unknown as { setMuted?: (m: boolean) => void }).setMuted = setMuted;

        try {
            render(<Game />);
            const unmutedBtn = screen.getByRole('button', { name: /turn sounds off/i });
            expect(unmutedBtn.textContent).toContain('🔊');

            await user.click(unmutedBtn);

            expect(screen.getByRole('button', { name: /turn sounds on/i }).textContent).toContain('🔇');
            expect(window.localStorage.getItem('potions-muted')).toBe('true');
            expect(setMuted).toHaveBeenLastCalledWith(true);

            await user.click(screen.getByRole('button', { name: /turn sounds on/i }));

            expect(screen.getByRole('button', { name: /turn sounds off/i })).toBeInTheDocument();
            expect(window.localStorage.getItem('potions-muted')).toBe('false');
            expect(setMuted).toHaveBeenLastCalledWith(false);
        } finally {
            delete (audioEngine as unknown as { setMuted?: (m: boolean) => void }).setMuted;
        }
    });

    it('muted state survives unmount + remount (localStorage is the source of truth)', async () => {
        const user = userEvent.setup();
        const first = render(<Game />);
        await user.click(screen.getByRole('button', { name: /turn sounds off/i }));
        first.unmount();

        render(<Game />);
        // Initial markup is unmuted (SSR parity); the stored preference is
        // restored right after mount.
        expect(await screen.findByRole('button', { name: /turn sounds on/i })).toBeInTheDocument();
    });

    it('works when localStorage throws (private browsing) — no crash', async () => {
        const user = userEvent.setup();
        const real = window.localStorage;
        const throwing = {
            getItem: () => {
                throw new Error('SecurityError');
            },
            setItem: () => {
                throw new Error('SecurityError');
            },
        };
        Object.defineProperty(window, 'localStorage', { value: throwing, configurable: true });
        try {
            render(<Game />);
            await user.click(screen.getByRole('button', { name: /turn sounds off/i }));
            expect(screen.getByRole('button', { name: /turn sounds on/i })).toBeInTheDocument();
        } finally {
            Object.defineProperty(window, 'localStorage', { value: real, configurable: true });
        }
    });
});

// ===========================================================================
// R5 — CELEBRATION JUICE
// ===========================================================================
describe('R5: celebration overlay bursts stars/hearts sized to the action', () => {
    const burstOf = (epoch: number, magnitude: number) => ({ burst: { epoch, magnitude } });

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows the ✨ Yay! ✨ flash and emoji particles on celebrate', () => {
        const { rerender } = render(<CelebrationOverlay {...burstOf(0, 1)} />);
        rerender(<CelebrationOverlay {...burstOf(1, 1)} />);
        expect(screen.getByText(/yay/i)).toBeInTheDocument();
        expect(document.querySelectorAll('[data-testid="celebration-particle"]').length).toBeGreaterThan(0);
    });

    it('hard caps live DOM particles at 80 across rapid celebrations', () => {
        const { rerender, unmount } = render(<CelebrationOverlay {...burstOf(0, 1)} />);
        for (let epoch = 1; epoch <= 8; epoch++) {
            rerender(<CelebrationOverlay {...burstOf(epoch, 1)} />);
        }
        // All eight bursts still animating simultaneously:
        const live = document.querySelectorAll('[data-testid="celebration-particle"]').length;
        expect(live).toBeLessThanOrEqual(80);

        // After the lifetime passes, everything is removed — no leaks.
        act(() => {
            vi.advanceTimersByTime(2500);
        });
        expect(document.querySelectorAll('[data-testid="celebration-particle"]').length).toBe(0);
        unmount();
    });

    it('bigger actions burst bigger; small actions stay small', () => {
        const first = render(<CelebrationOverlay {...burstOf(1, 0.5)} />);
        const smallCount = document.querySelectorAll('[data-testid="celebration-particle"]').length;
        act(() => {
            vi.advanceTimersByTime(3000);
        });
        first.rerender(<CelebrationOverlay {...burstOf(2, 2)} />);
        const bigCount = document.querySelectorAll('[data-testid="celebration-particle"]').length;
        expect(bigCount).toBeGreaterThan(smallCount * 2);
        first.unmount();
    });

    it('unmount mid-burst leaves zero particles in the document', () => {
        const { rerender, unmount } = render(<CelebrationOverlay {...burstOf(1, 1)} />);
        rerender(<CelebrationOverlay {...burstOf(3, 1)} />);
        expect(document.querySelectorAll('[data-testid="celebration-particle"]').length).toBeGreaterThan(0);
        unmount();
        expect(document.querySelectorAll('[data-testid="celebration-particle"]').length).toBe(0);
    });

    it('reduced motion keeps the party but shrinks the storm', () => {
        // Full-motion baseline first, with default matchMedia.
        const normal = render(<CelebrationOverlay {...burstOf(1, 1)} />);
        const normalCount = document.querySelectorAll('[data-testid="celebration-particle"]').length;
        normal.unmount();

        const mm = overrideMatchMedia(true);
        try {
            const reduced = render(<CelebrationOverlay {...burstOf(1, 1)} />);
            const reducedCount = document.querySelectorAll('[data-testid="celebration-particle"]').length;
            expect(reducedCount).toBeGreaterThan(0);
            expect(reducedCount).toBeLessThan(normalCount);
            reduced.unmount();
        } finally {
            mm.restore();
        }
    });
});

// ===========================================================================
// R6 — REDUCED MOTION
// ===========================================================================
describe('R6: prefers-reduced-motion', () => {
    it('hook reports false when the user has no reduction preference', () => {
        const { result } = renderHook(() => usePrefersReducedMotion());
        expect(result.current).toBe(false);
    });

    it('hook reports true when reduce is set and reacts live to changes', () => {
        const mm = overrideMatchMedia(true);
        try {
            const { result } = renderHook(() => usePrefersReducedMotion());
            expect(result.current).toBe(true);

            act(() => {
                mm.fire(false);
            });
            expect(result.current).toBe(false);
        } finally {
            mm.restore();
        }
    });

    it('IridescentBackground skips looping ambient layers under reduced motion', () => {
        const mm = overrideMatchMedia(true);
        try {
            const reduced = render(<IridescentBackground />);
            expect(reduced.container.querySelectorAll('[data-testid="ambient-animated-layer"]').length).toBe(0);
            reduced.unmount();
        } finally {
            mm.restore();
        }

        const full = render(<IridescentBackground />);
        expect(full.container.querySelectorAll('[data-testid="ambient-animated-layer"]').length).toBeGreaterThan(0);
    });
});
