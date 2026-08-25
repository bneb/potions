
"use client";

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
}

class AudioEngine {
    private ctx: AudioContext | null = null;
    private muted = false;
    private readonly contextFactory?: () => AudioContext;

    constructor(options: AudioEngineOptions = {}) {
        this.contextFactory = options.contextFactory;
    }

    // --- Master mute --------------------------------------------------------

    /** Master mute. While muted, every play* method constructs zero nodes. */
    public setMuted(muted: boolean): void {
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
        if (this.ctx) return this.ctx;
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

        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.2);

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
}

// Export singleton (unchanged public surface for all components)
export const audioEngine = new AudioEngine();

// Export the class too (additive) so tests can build isolated instances.
export { AudioEngine };
