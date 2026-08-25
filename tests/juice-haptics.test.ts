/**
 * JUICE-TEAM acceptance tests: haptic ticks (progressive enhancement).
 *
 * jsdom does not implement navigator.vibrate, so each test installs its own
 * stub via Object.defineProperty — exactly the environment a real phone
 * presents (feature PRESENT) or an old tablet presents (feature MISSING).
 * The helper must degrade to a silent no-op in every degraded case.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    tick,
    tickLight,
    tickCelebrate,
    setHapticsMuted,
    LIGHT_TICK_MS,
    CELEBRATION_TICK_MS,
} from '@/components/Game/haptics';

type VibrateMock = ReturnType<typeof vi.fn>;
let vibrateMock: VibrateMock | null = null;
let installedVibrate = false;

/** Install a navigator.vibrate stub (jsdom lacks the API entirely). */
function installVibrate(impl?: (...args: unknown[]) => unknown): VibrateMock {
    vibrateMock = vi.fn(impl);
    Object.defineProperty(navigator, 'vibrate', {
        configurable: true,
        writable: true,
        value: vibrateMock,
    });
    installedVibrate = true;
    return vibrateMock;
}

/** Simulate a device with NO vibration API at all (old tablets, desktops). */
function uninstallVibrate(): void {
    try {
        delete (navigator as unknown as { vibrate?: unknown }).vibrate;
    } catch {
        // Fall through: defineProperty below still forces it non-functional.
    }
    Object.defineProperty(navigator, 'vibrate', {
        configurable: true,
        writable: true,
        value: undefined,
    });
    installedVibrate = false;
}

beforeEach(() => {
    window.localStorage.removeItem('potions-haptics');
    setHapticsMuted(false); // reset the module-level parent gate
});

afterEach(() => {
    if (installedVibrate || vibrateMock) uninstallVibrate();
    vibrateMock = null;
    window.localStorage.removeItem('potions-haptics');
    setHapticsMuted(false);
});

describe('juice/haptics: feature detection & defaults', () => {
    it('a plain tick() fires one vibration with a LIGHT duration (10–15ms band)', () => {
        const vibrate = installVibrate();
        tick();
        expect(vibrate).toHaveBeenCalledTimes(1);
        const arg = vibrate.mock.calls[0][0] as number;
        expect(typeof arg).toBe('number');
        expect(arg).toBeGreaterThanOrEqual(10);
        expect(arg).toBeLessThanOrEqual(15);
        expect(LIGHT_TICK_MS).toBeGreaterThanOrEqual(10);
        expect(LIGHT_TICK_MS).toBeLessThanOrEqual(15);
    });

    it('tickLight() matches the light default; tickCelebrate() uses the longer 20ms celebration tick', () => {
        const vibrate = installVibrate();
        tickLight();
        expect(vibrate).toHaveBeenLastCalledWith(LIGHT_TICK_MS);
        tickCelebrate();
        expect(vibrate).toHaveBeenLastCalledWith(CELEBRATION_TICK_MS);
        expect(CELEBRATION_TICK_MS).toBeGreaterThan(LIGHT_TICK_MS);
        expect(CELEBRATION_TICK_MS).toBeLessThanOrEqual(30); // "slightly longer", not a buzz-saw
    });

    it('custom patterns pass straight through (number or number[])', () => {
        const vibrate = installVibrate();
        tick([30, 40, 30]);
        expect(vibrate).toHaveBeenLastCalledWith([30, 40, 30]);
        tick(25);
        expect(vibrate).toHaveBeenLastCalledWith(25);
    });

    it('NO vibration API → silent no-op, never throws (old tablets / desktop)', () => {
        uninstallVibrate();
        expect(() => {
            tick();
            tickLight();
            tickCelebrate();
            tick([10, 20]);
        }).not.toThrow();
    });

    it('a THROWING vibrate implementation never propagates (some browsers throw)', () => {
        installVibrate(() => {
            throw new Error('NotAllowedError');
        });
        expect(() => {
            tick();
            tickCelebrate();
        }).not.toThrow();
    });
});

describe('juice/haptics: kill switch (localStorage potions-haptics)', () => {
    it("'false' disables ALL vibration without removing the API", () => {
        const vibrate = installVibrate();
        window.localStorage.setItem('potions-haptics', 'false');
        tick();
        tickLight();
        tickCelebrate();
        expect(vibrate).not.toHaveBeenCalled();
    });

    it("any other value ('true', garbage, absent) keeps haptics alive", () => {
        const vibrate = installVibrate();
        window.localStorage.setItem('potions-haptics', 'true');
        tick();
        expect(vibrate).toHaveBeenCalledTimes(1);

        window.localStorage.setItem('potions-haptics', 'loud-please');
        tick();
        expect(vibrate).toHaveBeenCalledTimes(2);

        window.localStorage.removeItem('potions-haptics');
        tick();
        expect(vibrate).toHaveBeenCalledTimes(3);
    });

    it('kill switch is honored live (no reload needed): on→off→on mid-session', () => {
        const vibrate = installVibrate();
        tick();
        expect(vibrate).toHaveBeenCalledTimes(1);
        window.localStorage.setItem('potions-haptics', 'false');
        tick();
        expect(vibrate).toHaveBeenCalledTimes(1); // suppressed
        window.localStorage.removeItem('potions-haptics');
        tick();
        expect(vibrate).toHaveBeenCalledTimes(2); // alive again
    });
});

describe('juice/haptics: parent calm-switch gates touch as well as sound', () => {
    // POLICY (documented in haptics.ts): the existing 🔊/🔇 parent toggle is
    // ONE switch that silences BOTH channels — a parent who muted the game
    // believes the game is quiet; a buzzing phone betrays that trust.
    it('setHapticsMuted(true) suppresses every tick until unmuted', () => {
        const vibrate = installVibrate();

        setHapticsMuted(true);
        tick();
        tickLight();
        tickCelebrate();
        expect(vibrate).not.toHaveBeenCalled();

        setHapticsMuted(false);
        tick();
        expect(vibrate).toHaveBeenCalledTimes(1);
    });

    it('the kill switch and the parent gate compose (either one alone suffices)', () => {
        const vibrate = installVibrate();
        setHapticsMuted(false);
        window.localStorage.setItem('potions-haptics', 'true'); // kill switch OFF (alive)
        setHapticsMuted(true); // but parent muted
        tick();
        expect(vibrate).not.toHaveBeenCalled();
    });
});
