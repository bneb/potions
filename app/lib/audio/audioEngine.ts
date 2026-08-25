
"use client";

import { ANIMALS } from '../data';
import type { AnimalId } from '../schemas';

// Singleton AudioContext management to adhere to browser autoplay policies.
//
// Hardening contract (see tests/perf-audio.test.ts):
// - Lazy: no AudioContext is created at import time or at construction, only
//   on the first audible path (user-initiated sound or an explicit init()).
// - SSR-safe: constructing this module (or calling play* methods) in a Node /
//   no-window environment must never throw; unavailable audio degrades to a
//   silent no-op.
// - Injectable: an optional `contextFactory` constructor option lets tests
//   supply a fake context headlessly. Omitting it preserves legacy behavior
//   (window.AudioContext || webkitAudioContext).
// - Mutable master mute: while muted, play* methods construct ZERO audio
//   nodes and never touch (or construct) the context.
// - Hygiene: every oscillator start() has a matching stop(), centralized in
//   connectAndSchedule() below.

export interface AudioEngineOptions {
    /**
     * Optional factory used to construct the underlying AudioContext.
     * Intended for tests injecting a headless fake. When omitted, the engine
     * falls back to `window.AudioContext || webkitAudioContext`.
     */
    contextFactory?: () => AudioContext;
    /**
     * Optional injectable RNG driving generative-music variation (note/rest/
     * octave choices). Defaults to Math.random; tests inject a seeded RNG to
     * pin determinism.
     */
    rng?: () => number;
}

class AudioEngine {
    private ctx: AudioContext | null = null;
    private muted = false;
    private readonly contextFactory?: () => AudioContext;

    // --- Generative music-box state ---
    private musicTimerId: ReturnType<typeof setTimeout> | null = null;
    private musicPlaying = false;
    private nextNoteTime = 0;
    private melodyIndex = 4; // start on A5 — a bright, friendly first note
    private rng: () => number;

    constructor(options: AudioEngineOptions = {}) {
        this.contextFactory = options.contextFactory;
        this.rng = options.rng ?? Math.random;
    }

    // --- Master mute --------------------------------------------------------

    /**
     * Master mute. While muted, every play* method constructs zero nodes and
     * the music scheduler is halted through a PRIVATE path (chain cleared, no
     * new notes). The public stopMusic() is deliberately NOT invoked here:
     * the Game component owns the music lifecycle around mute transitions
     * (it calls stopMusic/startMusic itself) and must not observe phantom
     * engine-internal stops. Already-scheduled plucks are quiet (≤0.05) and
     * finish naturally within ~1 s.
     */
    public setMuted(muted: boolean): void {
        if (muted) {
            this.haltMusicScheduler();
            this.musicPlaying = false;
        }
        this.muted = muted;
    }

    public isMuted(): boolean {
        return this.muted;
    }

    // --- Context lifecycle ---------------------------------------------------

    /**
     * Lazily obtain the context, constructing it on first need. Returns null
     * when audio is unavailable (muted, SSR/no window, or the Web Audio API
     * is missing / construction fails) so callers can degrade to a silent
     * no-op instead of throwing.
     */
    private getContext(): AudioContext | null {
        if (this.ctx) {
            // Mid-session self-heal: iOS (FaceTime/Siri/app-switch) suspends
            // the CACHED context long after construction; the construction-
            // path resume is long gone. Re-kick fire-and-forget whenever the
            // page is visible, so music and SFX recover on the next tap/tick
            // instead of going permanently silent. Hidden tabs are left
            // alone (no resume spam against browser background throttling).
            if (this.ctx.state !== 'running' && typeof document !== 'undefined' && document.visibilityState === 'visible') {
                void this.ctx.resume().catch(() => {});
            }
            return this.ctx;
        }
        if (this.muted) return null;

        let ctx: AudioContext | null = null;
        try {
            if (this.contextFactory) {
                ctx = this.contextFactory();
            } else if (typeof window !== 'undefined') {
                const Ctor =
                    window.AudioContext ??
                    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
                if (typeof Ctor === 'function') {
                    ctx = new Ctor();
                }
            }
        } catch {
            // Audio subsystem unavailable (or a misbehaving injected factory):
            // degrade to a silent no-op. Caching the miss as null keeps later
            // calls retrying cheaply, so audio recovers automatically if
            // availability changes (e.g. after hydration).
            ctx = null;
        }

        // Autoplay self-heal: browsers (notably iOS Safari) may hand back a
        // suspended context even when constructed inside a user gesture.
        // Fire-and-forget resume keeps sounds audible without every caller
        // having to await init(); rejections (resume outside a gesture) are
        // swallowed — the next tap retries.
        if (ctx && ctx.state === 'suspended') {
            void ctx.resume().catch(() => {});
        }

        this.ctx = ctx;
        return ctx;
    }

    /** Ensure the context exists and is running. Call from a user gesture. */
    public async init(): Promise<void> {
        const ctx = this.getContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
    }

    // --- Shared graph plumbing ----------------------------------------------

    /** Single place where nodes are wired and scheduled (guarantees start/stop pairing). */
    private connectAndSchedule(
        ctx: AudioContext,
        osc: OscillatorNode,
        gain: GainNode,
        startTime: number,
        stopTime: number,
    ): void {
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(stopTime);
    }

    private makeOsc(ctx: AudioContext, type: OscillatorType): OscillatorNode {
        const osc = ctx.createOscillator();
        osc.type = type;
        return osc;
    }

    private makeGain(ctx: AudioContext): GainNode {
        return ctx.createGain();
    }

    // --- Sound Effects -------------------------------------------------------

    public playPop(): void {
        if (this.muted) return;
        const ctx = this.getContext();
        if (!ctx) return;
        const t = ctx.currentTime;

        const osc = this.makeOsc(ctx, 'sine');
        const gain = this.makeGain(ctx);

        // Frequency drop for "pop"
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);

        // Short envelope
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        this.connectAndSchedule(ctx, osc, gain, t, t + 0.15);
    }

    public playMagic(): void {
        if (this.muted) return;
        const ctx = this.getContext();
        if (!ctx) return;
        const t = ctx.currentTime;
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

        notes.forEach((freq, i) => {
            const osc = this.makeOsc(ctx, 'sine');
            const gain = this.makeGain(ctx);

            const startTime = t + (i * 0.08);
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

            this.connectAndSchedule(ctx, osc, gain, startTime, startTime + 0.25);
        });
    }

    public playGrowth(): void {
        if (this.muted) return;
        const ctx = this.getContext();
        if (!ctx) return;
        const t = ctx.currentTime;

        const osc = this.makeOsc(ctx, 'sawtooth');
        const gain = this.makeGain(ctx);

        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.3);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        this.connectAndSchedule(ctx, osc, gain, t, t + 0.35);
    }

    public playShrink(): void {
        if (this.muted) return;
        const ctx = this.getContext();
        if (!ctx) return;
        const t = ctx.currentTime;

        const osc = this.makeOsc(ctx, 'sine');
        const gain = this.makeGain(ctx);

        // Falling glide for "shrink": high → low reads as "smaller" to a
        // pre-reader (the legacy 400→1200 Hz rise accidentally read as
        // "growth"). Same playful short tail as before.
        osc.frequency.setValueAtTime(900, t);
        osc.frequency.exponentialRampToValueAtTime(250, t + 0.2);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

        this.connectAndSchedule(ctx, osc, gain, t, t + 0.25);
    }

    public playRainbow(): void {
        if (this.muted) return;
        const ctx = this.getContext();
        if (!ctx) return;
        const t = ctx.currentTime;

        for (let i = 0; i < 5; i++) {
            const osc = this.makeOsc(ctx, 'triangle');
            const gain = this.makeGain(ctx);

            const freq = 300 + (i * 150);
            const startTime = t + (i * 0.05);

            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            this.connectAndSchedule(ctx, osc, gain, startTime, startTime + 0.35);
        }
    }

    public playRed(): void { this.playMagic(); } // Reuse
    public playPurple(): void { this.playMagic(); } // Reuse

    public playPresent(): void {
        this.playPop();
        setTimeout(() => this.playMagic(), 100);
    }

    public playSunshine(): void {
        if (this.muted) return;
        const ctx = this.getContext();
        if (!ctx) return;
        const t = ctx.currentTime;
        const notes = [784, 988, 1175, 1319]; // G5, B5, D6, E6

        notes.forEach((freq, i) => {
            const osc = this.makeOsc(ctx, 'sine');
            const gain = this.makeGain(ctx);

            const startTime = t + (i * 0.06);
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            this.connectAndSchedule(ctx, osc, gain, startTime, startTime + 0.35);
        });
    }

    public playHotdog(): void {
        if (this.muted) return;
        const ctx = this.getContext();
        if (!ctx) return;
        const t = ctx.currentTime;

        const osc = this.makeOsc(ctx, 'sine');
        const gain = this.makeGain(ctx);

        // Bouncy
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.2);
        osc.frequency.exponentialRampToValueAtTime(500, t + 0.3);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        this.connectAndSchedule(ctx, osc, gain, t, t + 0.35);
    }

    public playError(): void {
        if (this.muted) return;
        const ctx = this.getContext();
        if (!ctx) return;
        const t = ctx.currentTime;

        const osc = this.makeOsc(ctx, 'square');
        const gain = this.makeGain(ctx);

        osc.frequency.setValueAtTime(150, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        this.connectAndSchedule(ctx, osc, gain, t, t + 0.15);
    }

    // --- Animal Voices -------------------------------------------------------

    /**
     * Play the per-animal cry configured on ANIMALS[id].voice: `repeats`
     * short glide segments (freqStart → freqEnd over durationMs) separated
     * by gapMs, each through the shared envelope plumbing. Mute-gated with
     * zero node construction; unknown ids degrade to a silent no-op.
     */
    public playAnimalVoice(id: AnimalId): void {
        if (this.muted) return;
        const voice = ANIMALS.find(a => a.id === id)?.voice;
        if (!voice) return;
        const ctx = this.getContext();
        if (!ctx) return;

        // Defensive clamps (schema already enforces these; belt & suspenders
        // because the sound lands right next to toddler ears). The aggregate
        // span clamp is defense in depth: even a config that bypassed the
        // schema cannot schedule more than ~1.2 s of call.
        const segS = Math.min(voice.durationMs, 350) / 1000;
        const peak = Math.min(voice.peakGain, 0.25);
        let gapS = Math.min(voice.gapMs ?? 0, 400) / 1000;
        if (voice.repeats && voice.repeats > 1) gapS = Math.max(gapS, 0.025); // release-tail floor
        let repeats = Math.max(1, Math.min(voice.repeats ?? 1, 4));
        const MAX_SPAN_S = 1.2;
        const step = segS + gapS;
        if ((repeats - 1) * step > MAX_SPAN_S - segS) {
            repeats = Math.max(1, Math.floor((MAX_SPAN_S - segS) / step) + 1);
        }

        for (let i = 0; i < repeats; i++) {
            const start = ctx.currentTime + i * (segS + gapS);

            const osc = this.makeOsc(ctx, voice.wave);
            const gain = this.makeGain(ctx);

            osc.frequency.setValueAtTime(Math.max(30, voice.freqStart), start);
            osc.frequency.exponentialRampToValueAtTime(Math.max(30, voice.freqEnd), start + segS);

            // Gentle attack (~20 ms), exponential decay to inaudibility.
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.linearRampToValueAtTime(peak, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + segS);

            this.connectAndSchedule(ctx, osc, gain, start, start + segS + 0.02);
        }
    }

    // --- Generative music-box loop -------------------------------------------

    /**
     * A gentle ambient loop of pentatonic "music-box" plucks.
     *
     * Architecture: a classic lookahead scheduler driven by ONE self-chaining
     * setTimeout (~500 ms). Each tick schedules every note falling in the
     * next ~2 s directly on the context timeline (never rAF, never per-note
     * timers), so timing accuracy comes from the audio clock while the
     * main-thread cost is one tiny pass per 500 ms.
     *
     * Variation is driven by the injectable RNG (constructor `rng` option or
     * a startMusic() argument; default Math.random): an always-move random
     * walk over C-major pentatonic (no consecutive repeats, no rail-dwelling),
     * tasteful rests, occasional soft octave-down doubling. Per-note peak
     * gain ≤0.05 — a whisper under the sound effects.
     *
     * Muting: setMuted(true) stops the loop cleanly; startMusic() while
     * muted constructs zero nodes and never builds a context. SSR/no-window
     * and missing audio are silent no-ops. Gesture-gating (calling
     * startMusic from a user gesture / after init()) is the component's job.
     */
    public startMusic(rng?: () => number): void {
        if (this.musicPlaying) return; // idempotent: never arm a second timer chain
        if (this.muted) return; // structural mute gate: zero nodes, zero timers
        if (typeof window === 'undefined') return; // SSR safety
        if (rng) this.rng = rng;

        const ctx = this.getContext();
        if (!ctx) return;

        this.musicPlaying = true;
        this.nextNoteTime = ctx.currentTime + 0.08;
        try {
            this.runMusicTick();
        } catch {
            this.stopMusic(); // degrade to silence rather than spin an error loop
            return;
        }
        this.armMusicTimer();
    }

    /**
     * Stop the music loop: clears the scheduler timer so no further notes are
     * constructed. Already-scheduled oscillators are left to finish naturally
     * (each pluck decays within ~1 s). Safe to call repeatedly / when stopped.
     */
    public stopMusic(): void {
        this.haltMusicScheduler();
        this.musicPlaying = false;
    }

    /**
     * Private scheduler teardown shared by stopMusic() and setMuted(true).
     * Kept separate from the public method so engine-internal muting never
     * re-enters (and never double-counts against) the component-facing API.
     */
    private haltMusicScheduler(): void {
        if (this.musicTimerId !== null) {
            clearTimeout(this.musicTimerId);
            this.musicTimerId = null;
        }
    }

    public isMusicPlaying(): boolean {
        return this.musicPlaying;
    }

    private armMusicTimer(): void {
        this.musicTimerId = setTimeout(() => {
            this.musicTimerId = null;
            try {
                this.runMusicTick();
            } catch {
                this.stopMusic();
                return;
            }
            this.armMusicTimer();
        }, MUSIC_TICK_MS);
    }

    /** One lookahead scheduling pass. Steady state ≈1 note; up to ~4 on the
     *  cold-start pass right after startMusic(). */
    private runMusicTick(): void {
        if (!this.musicPlaying || this.muted) return;

        const ctx = this.getContext();
        if (!ctx) return; // keep the chain alive; audio may appear later

        // Pause on hidden tabs: schedule nothing (the tick itself keeps
        // running — polling visibilityState here is trivially testable and
        // costs nothing). On resume the clock snaps forward below, so the
        // melody continues without dumping a burst of catch-up notes.
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

        const now = ctx.currentTime;
        if (this.nextNoteTime < now) this.nextNoteTime = now + 0.05; // resume/drift snap

        const horizon = now + MUSIC_LOOKAHEAD_S;
        while (this.nextNoteTime < horizon) {
            const t = this.nextNoteTime;
            const rng = this.rng;

            if (rng() >= MUSIC_REST_PROB) { // breathing room: sometimes just rest
                // Always-move random walk: choose uniformly among LEGAL
                // neighbours (±1/±2 within the scale, ±1 twice as likely).
                // Filtering instead of clamping guarantees the melody never
                // stutters on the same pitch and never dwells on the rails.
                const candidates: number[] = [];
                for (const d of MUSIC_WALK_DELTAS) {
                    const n = this.melodyIndex + d;
                    if (n >= 0 && n < MUSIC_BOX_SCALE_HZ.length) candidates.push(n);
                }
                this.melodyIndex = candidates[Math.floor(rng() * candidates.length)];
                const freq = MUSIC_BOX_SCALE_HZ[this.melodyIndex];
                const wave: OscillatorType = rng() < MUSIC_TRIANGLE_PROB ? 'triangle' : 'sine';
                const peak = Math.min(0.03 + rng() * 0.02, MUSIC_MAX_NOTE_GAIN);

                this.schedulePluck(ctx, freq, t, wave, peak);
                if (rng() < MUSIC_OCTAVE_DROP_PROB) { // occasional soft bass shadow
                    this.schedulePluck(ctx, freq / 2, t, wave, peak * 0.7);
                }
            }

            // Humanize the pulse slightly (0.9–1.15×, i.e. ~−10%/+15%) so it
            // breathes instead of metronoming.
            this.nextNoteTime = t + MUSIC_BASE_STEP_S * (0.9 + rng() * 0.25);
        }
    }

    private schedulePluck(ctx: AudioContext, freq: number, start: number, wave: OscillatorType, peak: number): void {
        const osc = this.makeOsc(ctx, wave);
        const gain = this.makeGain(ctx);

        // Music box: instant strike, fast exponential ring-down. Lower notes
        // get a touch more ring, like real tines.
        const decayS = freq >= 1000 ? 0.85 : 1.1;

        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(peak, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + decayS);

        this.connectAndSchedule(ctx, osc, gain, start, start + decayS + 0.05);
    }
}

// --- Music-box constants -----------------------------------------------------

/** C-major pentatonic across two registers: C5 D5 E5 G5 A5 | C6 D6 E6. */
const MUSIC_BOX_SCALE_HZ = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51] as const;

const MUSIC_TICK_MS = 500;          // one setTimeout chain, ~2 ticks/s
const MUSIC_LOOKAHEAD_S = 2;        // schedule ~2 s ahead on the context timeline
const MUSIC_BASE_STEP_S = 0.55;     // nominal inter-note step (± humanized jitter)
const MUSIC_REST_PROB = 0.22;       // gentle breathing room between phrases
const MUSIC_TRIANGLE_PROB = 0.3;    // timbre mix: mostly sine, some triangle
const MUSIC_OCTAVE_DROP_PROB = 0.12;// occasional soft octave-down shadow note
const MUSIC_MAX_NOTE_GAIN = 0.05;   // hard whisper cap per note
/** Step candidates for the always-move walk (±1 weighted over ±2). */
const MUSIC_WALK_DELTAS = [-2, -1, -1, 1, 1, 2] as const;

// Export singleton (unchanged public surface for all components)
export const audioEngine = new AudioEngine();

// Export the class too (additive) so tests can build isolated instances.
export { AudioEngine };
