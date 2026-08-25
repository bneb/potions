"use client";

/**
 * Haptic ticks — progressive enhancement for little fingers.
 *
 * A tiny wrapper around navigator.vibrate (Android Chrome/Firefox; silently
 * absent on iOS Safari and all desktops). Every failure mode degrades to a
 * silent no-op:
 *
 *  - API missing (typeof check) → no-op. Old tablets, desktops, jsdom.
 *  - API throws (some browsers throw on unsupported patterns or without
 *    user activation) → caught, no-op.
 *  - SSR / Node (no window.localStorage, odd navigator globals) → no-op.
 *
 * POLICY DECISION — the parent 🔊/🔇 toggle ALSO gates haptics:
 * Parents get ONE calm-switch. A parent who taps 🔇 believes the game has
 * gone quiet; a phone that still buzzes in their pocket betrays that trust,
 * and "the sounds are off but I had to find a second setting" is exactly the
 * friction this game avoids elsewhere. Concretely Game.tsx mirrors its muted
 * state onto setHapticsMuted() right next to audioEngine.setMuted(), so both
 * channels flip together and persist via the same 'potions-muted' key.
 * Escape hatch for households that want silence-with-buzz: the dedicated
 * localStorage kill switch 'potions-haptics' === 'false' below.
 *
 * GESTURE RULE — we never vibrate except downstream of a real tap: every
 * tick() call site sits inside an event handler or a timeout scheduled BY
 * one (e.g. Surprise! walk steps), mirroring how the game already schedules
 * its sounds. No mount/render/idle vibrations, ever.
 *
 * REDUCED MOTION — ticks intentionally still fire under
 * prefers-reduced-motion. That media query exists because ANIMATION causes
 * vestibular distress; a 12ms static pulse carries no motion energy, moves
 * nothing on screen, and for kids who need calmer screens it REPLACES visual
 * motion as the feedback channel. Known trade-off: some users read the OS
 * setting as "calm everything", and an unexpected buzz can be aversive to
 * sensory-sensitive kids (or whoever is holding the device) — the parent
 * calm-switch above and the kill switch below are the explicit off-ramps,
 * and any future parents-facing UI should surface both together.
 */

/** Light acknowledgement tick, tuned inside the 10–15ms band. */
export const LIGHT_TICK_MS = 12;

/** Celebration tick — slightly longer so big moments feel bigger. */
export const CELEBRATION_TICK_MS = 20;

const HAPTICS_STORAGE_KEY = 'potions-haptics';

/**
 * Module-level parent gate (see POLICY DECISION above). Flipped by Game's
 * mute-mirroring effect; NOT persisted here — 'potions-muted' already owns
 * persistence and Game restores it on mount.
 */
let gatedByParentMute = false;

/** Mirror of the parent's sound toggle onto the touch channel. */
export function setHapticsMuted(muted: boolean): void {
    gatedByParentMute = muted;
}

/**
 * Kill switch, read per-tick rather than cached at import: taps are
 * human-rate (<10/s) and localStorage reads are microseconds, while reading
 * live means flipping the switch takes effect immediately — no reload, and
 * tests/parents can toggle mid-session. Private-browsing StorageErrors are
 * swallowed (default = enabled, matching the sound story).
 */
function isKilledByLocalStorage(): boolean {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return false;
        return window.localStorage.getItem(HAPTICS_STORAGE_KEY) === 'false';
    } catch {
        return false;
    }
}

/**
 * Fire one vibration pattern. Defaults to a light 12ms tick; celebrations
 * pass CELEBRATION_TICK_MS. Never throws, never fires when the API, the
 * parent gate, or the kill switch says no.
 */
export function tick(pattern: number | number[] = LIGHT_TICK_MS): void {
    try {
        if (gatedByParentMute || isKilledByLocalStorage()) return;
        // Feature detection: vibrate may be missing entirely (iOS, desktop,
        // jsdom) — and Node 21+ exposes a navigator global WITHOUT vibrate,
        // so the typeof guard is what keeps SSR/import-time safety.
        if (typeof navigator === 'undefined') return;
        // Pinned structural type instead of relying on the DOM lib's
        // Navigator.vibrate signature, which varies between lib versions
        // (some type the parameter as VibratePattern, some as
        // Iterable<number>); our runtime contract is number | number[].
        const nav = navigator as unknown as {
            vibrate?: (pattern: number | number[]) => boolean;
        };
        if (typeof nav.vibrate !== 'function') return;
        nav.vibrate(pattern);
    } catch {
        // Some browsers throw (unsupported pattern / missing activation):
        // haptics are garnish, never worth a crash.
    }
}

/** Semantic alias for tap feedback on cards/buttons. */
export function tickLight(): void {
    tick(LIGHT_TICK_MS);
}

/** Semantic alias for celebration bursts (longer, more satisfying). */
export function tickCelebrate(): void {
    tick(CELEBRATION_TICK_MS);
}
