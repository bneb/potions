/**
 * JUICE-TEAM acceptance tests: wiring the AUDIO TEAM's in-flight engine APIs
 * (startMusic / stopMusic / isMusicPlaying / playAnimalVoice) plus haptic
 * ticks into the game surface — all called DEFENSIVELY.
 *
 * These tests install instance-level mock methods onto the exported
 * `audioEngine` singleton (the same shadowing trick fun-ux uses for
 * setMuted). They therefore pass/fail on WHICH METHOD NAMES Game calls with
 * WHICH arguments — provable today, before the audio team's code lands.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Game } from '@/components/Game/Game';
import { audioEngine } from '@/lib/audio/audioEngine';
import { setHapticsMuted, LIGHT_TICK_MS, CELEBRATION_TICK_MS } from '@/components/Game/haptics';

// --- Defensive engine-method mocks (instance props shadow any future impl) --
const startMusic = vi.fn();
const stopMusic = vi.fn();
let musicPlaying = false;
const playAnimalVoice = vi.fn();
const playPopSpy = vi.spyOn(audioEngine, 'playPop');

function installMusicMocks(): void {
    const engine = audioEngine as unknown as Record<string, unknown>;
    startMusic.mockImplementation(() => { musicPlaying = true; });
    stopMusic.mockImplementation(() => { musicPlaying = false; });
    engine.startMusic = startMusic;
    engine.stopMusic = stopMusic;
    engine.isMusicPlaying = () => musicPlaying;
}

function uninstallEngineMocks(): void {
    const engine = audioEngine as unknown as Record<string, unknown>;
    delete engine.startMusic;
    delete engine.stopMusic;
    delete engine.isMusicPlaying;
    delete engine.playAnimalVoice;
}

// --- navigator.vibrate stub (jsdom lacks the API) ---------------------------
let vibrateMock: ReturnType<typeof vi.fn> | null = null;

function installVibrate(): ReturnType<typeof vi.fn> {
    vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
        configurable: true,
        writable: true,
        value: vibrateMock,
    });
    return vibrateMock;
}

beforeEach(() => {
    window.localStorage.clear();
    setHapticsMuted(false); // reset the module-level haptic gate between tests
    musicPlaying = false;
    startMusic.mockClear();
    stopMusic.mockClear();
    playAnimalVoice.mockClear();
    playPopSpy.mockClear();
    installMusicMocks();
    (audioEngine as unknown as Record<string, unknown>).playAnimalVoice = playAnimalVoice;
});

afterEach(() => {
    cleanup();
    // Hygiene against the landed REAL engine: any test that clicked a game
    // control may have armed the engine's self-chaining scheduler on the
    // shared singleton. Stop it explicitly so no oscillators leak into later
    // tests (or into other suites via module-registry reuse patterns).
    if (typeof audioEngine.stopMusic === 'function') audioEngine.stopMusic();
    audioEngine.setMuted(false);
    uninstallEngineMocks();
    if (vibrateMock) {
        // Truly DELETE the own property (not merely set undefined) so the
        // "API missing" path stays genuinely missing for the next test.
        delete (navigator as unknown as { vibrate?: unknown }).vibrate;
        Object.defineProperty(navigator, 'vibrate', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: undefined,
        });
        try {
            delete (navigator as unknown as { vibrate?: unknown }).vibrate;
        } catch {
            // jsdom keeps it as an own undefined prop in some builds — still
            // falsy for the typeof check haptics.ts uses.
        }
        vibrateMock = null;
    }
});

describe('juice/music: lazy start on first user interaction', () => {
    it('NEVER starts music on mount/render (autoplay policy: no gesture, no loop)', () => {
        render(<Game />);
        expect(startMusic).not.toHaveBeenCalled();
    });

    it('starts exactly ONCE across many different taps (animal card + shelf + header)', async () => {
        const user = userEvent.setup();
        render(<Game />);

        await user.click(screen.getAllByRole('button', { name: /t-rex/i })[0]);
        await user.click(screen.getByRole('button', { name: /growth potion/i }));
        await user.click(screen.getByRole('button', { name: /select all/i }));

        expect(startMusic).toHaveBeenCalledTimes(1);
    });

    it('a single animal-card tap is enough to unlock the loop', async () => {
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getAllByRole('button', { name: /dragon/i })[0]);
        expect(startMusic).toHaveBeenCalledTimes(1);
    });

    it('stops when the parent mutes, restarts on unmute ONLY because it was playing', async () => {
        const user = userEvent.setup();
        render(<Game />);

        await user.click(screen.getAllByRole('button', { name: /husky/i })[0]);
        expect(startMusic).toHaveBeenCalledTimes(1);
        expect(stopMusic).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button', { name: /turn sounds off/i }));
        expect(stopMusic).toHaveBeenCalledTimes(1);

        await user.click(screen.getByRole('button', { name: /turn sounds on/i }));
        // Restarted: it WAS playing before the mute.
        expect(startMusic).toHaveBeenCalledTimes(2);
    });

    it('muted-from-birth game never auto-starts music on unmute (it was NOT playing before)', async () => {
        const user = userEvent.setup();
        render(<Game />);

        // Parent mutes BEFORE the kid's first tap…
        await user.click(screen.getByRole('button', { name: /turn sounds off/i }));
        expect(startMusic).not.toHaveBeenCalled();

        // …kid plays anyway…
        await user.click(screen.getAllByRole('button', { name: /santa/i })[0]);
        await user.click(screen.getByRole('button', { name: /growth potion/i }));
        expect(startMusic).not.toHaveBeenCalled();

        // …parent unmutes: music must NOT ambush the room unprompted.
        await user.click(screen.getByRole('button', { name: /turn sounds on/i }));
        expect(startMusic).not.toHaveBeenCalled();

        // But the NEXT tap unlocks it normally.
        await user.click(screen.getAllByRole('button', { name: /elephant/i })[0]);
        expect(startMusic).toHaveBeenCalledTimes(1);
    });

    it('never double-starts even when taps land in quick succession', async () => {
        render(<Game />);
        // fireEvent (no awaiting between clicks) = back-to-back taps in one burst.
        fireEvent.click(screen.getAllByRole('button', { name: /t-rex/i })[0]);
        fireEvent.click(screen.getByRole('button', { name: /select all/i }));
        fireEvent.click(screen.getByRole('button', { name: /surprise/i }));
        expect(startMusic).toHaveBeenCalledTimes(1);
    });

    it('the sorcerer is part of the game surface: tapping him also counts as the first interaction', async () => {
        const vibrate = installVibrate();
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getByRole('button', { name: /wave the magic wand/i }));
        expect(startMusic).toHaveBeenCalledTimes(1);
        expect(vibrate).toHaveBeenCalled(); // light tap acknowledgement
    });

    it('HEALS when the engine-side music dies mid-session (stale local flag must not orphan silence)', async () => {
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getAllByRole('button', { name: /t-rex/i })[0]);
        expect(startMusic).toHaveBeenCalledTimes(1);

        // Simulate an internal scheduler death (audio-route glitch → the
        // engine's own catch calls stopMusic): its playing flag flips false
        // BEHIND Game's back.
        musicPlaying = false;

        // The kid keeps tapping friends — music must come back with them.
        await user.click(screen.getAllByRole('button', { name: /dragon/i })[0]);
        expect(startMusic).toHaveBeenCalledTimes(2);
    });

    // NOTE: the old transitional "probe absent/lying" scenarios were removed
    // at integration: the music APIs are compile-checked members of
    // AudioEngine now, and the guarantees they pinned live on in
    // "starts exactly ONCE across many taps" (double-start shield),
    // "HEALS when the engine-side music dies" (authoritative probe), and
    // "a THROWING music engine never breaks a tap" (crash safety).

    it('a THROWING music engine never breaks a tap (garnish must not crash gameplay)', async () => {
        // The APIs are contractual now, so "missing method" cannot happen —
        // but a device-specific audio failure can still THROW. The tap (the
        // game itself) must always land.
        const throwingEngine = audioEngine as unknown as Record<string, unknown>;
        throwingEngine.startMusic = vi.fn(() => { throw new Error('audio route dead'); });
        throwingEngine.isMusicPlaying = vi.fn(() => { throw new Error('audio route dead'); });
        throwingEngine.playAnimalVoice = vi.fn(() => { throw new Error('synth exploded'); });
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getAllByRole('button', { name: /t-rex/i })[0]);
        expect(screen.getByText(/T-Rex is ready/i)).toBeInTheDocument(); // game fully alive
    });

    it('scrolling the carousel alone is NOT an interaction: no music, no vibration', () => {
        const vibrate = installVibrate();
        render(<Game />);
        const scroller = document.querySelector('.no-scrollbar') as HTMLElement;
        expect(scroller).not.toBeNull();
        fireEvent.scroll(scroller, { target: { scrollLeft: 500 } });
        expect(startMusic).not.toHaveBeenCalled();
        expect(vibrate).not.toHaveBeenCalled();
    });

    it('unmount stops the loop (leaving the game silences the scheduler at the source)', async () => {
        const user = userEvent.setup();
        const { unmount } = render(<Game />);
        await user.click(screen.getAllByRole('button', { name: /husky/i })[0]);
        expect(startMusic).toHaveBeenCalledTimes(1);
        unmount();
        expect(stopMusic).toHaveBeenCalledTimes(1);
    });

    it('returning to a visible tab nudges the throttled chain back awake', async () => {
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getAllByRole('button', { name: /husky/i })[0]);
        expect(startMusic).toHaveBeenCalledTimes(1);

        // Chrome clamps timers of hidden silent pages toward ~1/min; on return
        // Game should restart the chain through the public API instead of
        // waiting out the last clamped tick.
        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });
        expect(stopMusic).toHaveBeenCalledTimes(1);
        expect(startMusic).toHaveBeenCalledTimes(2);
    });
});

describe('juice/voices: per-animal voice replaces the generic pop on cards', () => {
    it('tapping an animal card calls playAnimalVoice(animal.id), not playPop', async () => {
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getAllByRole('button', { name: /t-rex/i })[0]);
        expect(playAnimalVoice).toHaveBeenCalledWith('trex');
        expect(playPopSpy).not.toHaveBeenCalled();
    });

    it('falls back to playPop() while playAnimalVoice is unavailable', async () => {
        // SHADOW, don't delete: the audio team's real playAnimalVoice has
        // landed on the prototype mid-flight, so deleting our instance mock
        // would reveal it and exercise THEIR code instead of ours. Setting
        // the instance property to `undefined` shadows any upstream method,
        // pinning the test to OUR wrapper's fallback branch.
        (audioEngine as unknown as Record<string, unknown>).playAnimalVoice = undefined;
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getAllByRole('button', { name: /dragon/i })[0]);
        expect(playPopSpy).toHaveBeenCalled();
        expect(playAnimalVoice).not.toHaveBeenCalled(); // shadowed → wrapper skipped it
    });

    it('header select-all keeps the classic pop — no voices on utility actions', async () => {
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getByRole('button', { name: /select all/i }));
        expect(playPopSpy).toHaveBeenCalled();
        expect(playAnimalVoice).not.toHaveBeenCalled();
    });

    it('a muted parent silences card voices too (silent prop still honored)', async () => {
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getByRole('button', { name: /turn sounds off/i }));
        await user.click(screen.getAllByRole('button', { name: /crocodile/i })[0]);
        expect(playAnimalVoice).not.toHaveBeenCalled();
        expect(playPopSpy).not.toHaveBeenCalled();
    });

    it('a THROWING voice synth must never eat the tap: falls back to pop, selection still lands', async () => {
        playAnimalVoice.mockImplementation(() => {
            throw new Error('gain.gain.setValueAtTime is not a function');
        });
        const user = userEvent.setup();
        render(<Game />);
        const trex = screen.getAllByRole('button', { name: /t-rex/i })[0];
        await user.click(trex); // must not throw out of the handler
        expect(trex).toHaveAttribute('aria-pressed', 'true'); // selection completed
        expect(playPopSpy).toHaveBeenCalled(); // degraded to the classic pop
    });

    it('COMPOUND failure: even a throwing FALLBACK pop can never eat the tap (verifier MAJOR)', async () => {
        // Shared synth plumbing is broken, so BOTH the voice and the fallback
        // pop throw. Selection is the game — it must still land and the
        // handler must never surface an error.
        playAnimalVoice.mockImplementation(() => {
            throw new Error('gain.gain.setValueAtTime is not a function');
        });
        playPopSpy.mockImplementation(() => {
            throw new Error('audio route dead too');
        });
        const user = userEvent.setup();
        render(<Game />);
        const trex = screen.getAllByRole('button', { name: /t-rex/i })[0];
        await user.click(trex); // must not throw out of the handler
        expect(trex).toHaveAttribute('aria-pressed', 'true'); // selection completed
    });
});

describe('juice/haptics: component-level wiring', () => {
    it('animal-card tap fires exactly one LIGHT tick (attribution-exact)', async () => {
        const vibrate = installVibrate();
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getAllByRole('button', { name: /husky/i })[0]);
        expect(vibrate.mock.calls.map((c) => c[0])).toEqual([LIGHT_TICK_MS]);
    });

    it('potion application pairs light + celebration exactly ([light, celebrate])', async () => {
        const vibrate = installVibrate();
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getByRole('button', { name: /growth potion/i }));
        expect(vibrate.mock.calls.map((c) => c[0])).toEqual([LIGHT_TICK_MS, CELEBRATION_TICK_MS]);
    });

    it('DRUMMING the potion stays inside the celebration budget (refractory window)', async () => {
        const vibrate = installVibrate();
        render(<Game />);
        const growth = screen.getByRole('button', { name: /growth potion/i });
        // A 3-year-old drums 5 taps in one breath — the reducer's reapply is
        // visually zero-delta after tap 1, so the party must not scale with
        // it. All clicks land within the refractory window.
        for (let i = 0; i < 5; i++) fireEvent.click(growth);
        const celebrateTicks = vibrate.mock.calls
            .map((c) => c[0] as number)
            .filter((d) => d > LIGHT_TICK_MS && d <= 30);
        expect(celebrateTicks.length).toBeGreaterThanOrEqual(1); // first tap still celebrates
        expect(celebrateTicks.length).toBeLessThanOrEqual(2); // drumming does NOT stack parties
        // Exact cadence: tap 1 = light tick + full party; taps 2–5 keep ONLY
        // their light ticks (touch feedback never dies, the party never scales).
        expect(vibrate.mock.calls.map((c) => c[0])).toEqual([
            LIGHT_TICK_MS,
            CELEBRATION_TICK_MS,
            LIGHT_TICK_MS,
            LIGHT_TICK_MS,
            LIGHT_TICK_MS,
            LIGHT_TICK_MS,
        ]);
    });

    it('NO vibration before ANY interaction (mount-silence / gesture-path discipline)', () => {
        const vibrate = installVibrate();
        vi.useFakeTimers();
        try {
            render(<Game />);
            // Run well past the Surprise-walk horizon and every mount timer:
            // nothing unsolicited may buzz the kid who only watched.
            act(() => {
                vi.advanceTimersByTime(4000);
            });
            expect(vibrate).not.toHaveBeenCalled();
            // And a real gesture unlocks feedback immediately:
            fireEvent.click(screen.getAllByRole('button', { name: /husky/i })[0]);
            expect(vibrate.mock.calls.map((c) => c[0])).toEqual([LIGHT_TICK_MS]);
        } finally {
            vi.useRealTimers();
        }
    });

    it('haptics still fire under prefers-reduced-motion (tactile is not motion)', async () => {
        const vibrate = installVibrate();
        // Capture the ORIGINAL matchMedia BEFORE overwriting (the verifier
        // caught the previous version restoring its own stub here).
        const realMatchMedia = window.matchMedia;
        const listeners = new Set<(e: { matches: boolean }) => void>();
        const current = true;
        window.matchMedia = ((query: string) => ({
            get matches() {
                return current;
            },
            media: query,
            onchange: null,
            addEventListener: (_t: string, l: (e: { matches: boolean }) => void) => listeners.add(l),
            removeEventListener: (_t: string, l: (e: { matches: boolean }) => void) => listeners.delete(l),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(() => false),
        })) as unknown as typeof window.matchMedia;
        try {
            const user = userEvent.setup();
            render(<Game />);
            await user.click(screen.getAllByRole('button', { name: /dragon/i })[0]);
            // Reduced motion calms ANIMATION; the static pulse remains as the
            // feedback channel that replaces it.
            expect(vibrate.mock.calls.map((c) => c[0])).toEqual([LIGHT_TICK_MS]);
        } finally {
            window.matchMedia = realMatchMedia; // restore the true original
        }
    });

    it('the very first tap of all — dismissing the hint card — gives touch feedback', () => {
        const vibrate = installVibrate();
        vi.useFakeTimers();
        try {
            render(<Game />);
            act(() => {
                vi.advanceTimersByTime(2100); // hint appears after its 2s beat
            });
            const card = screen.getByTestId('instructional-card');
            fireEvent.click(card);
            expect(vibrate).toHaveBeenCalled();
            expect(startMusic).toHaveBeenCalledTimes(1); // …and counts as the first interaction
        } finally {
            vi.useRealTimers();
        }
    });

    it('lab mode is not a haptic dead zone: ingredient taps tick too', async () => {
        const vibrate = installVibrate();
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getByRole('button', { name: /classic/i })); // → Lab Mode
        await user.click(screen.getAllByRole('button', { name: /add .* to cauldron/i })[0]);
        expect(vibrate.mock.calls.map((c) => c[0])).toEqual([LIGHT_TICK_MS]);
    });

    it('kill switch suppresses ALL component haptics without touching sound', async () => {
        const vibrate = installVibrate();
        window.localStorage.setItem('potions-haptics', 'false');
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getAllByRole('button', { name: /husky/i })[0]);
        await user.click(screen.getByRole('button', { name: /growth potion/i }));
        expect(vibrate).not.toHaveBeenCalled();
        // Sound path unaffected:
        expect(startMusic).toHaveBeenCalledTimes(1);
    });

    it('muted parent suppresses haptics too (one calm-switch, both channels)', async () => {
        const vibrate = installVibrate();
        const user = userEvent.setup();
        render(<Game />);
        await user.click(screen.getByRole('button', { name: /turn sounds off/i }));
        await user.click(screen.getAllByRole('button', { name: /husky/i })[0]);
        await user.click(screen.getByRole('button', { name: /growth potion/i }));
        expect(vibrate).not.toHaveBeenCalled();
    });
});
