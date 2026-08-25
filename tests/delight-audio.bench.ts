import { bench, describe } from 'vitest';
import { AudioEngine } from '@/lib/audio/audioEngine';

/**
 * DELIGHT-AUDIO benchmarks: the two new hot paths AUDIO TEAM owns.
 *
 * 1. MUSIC SCHEDULER TICK — one full lookahead scheduling pass (~500 ms of
 *    game time each, runs 2×/s while music plays).
 * 2. PLAY-ANIMAL-VOICE envelope construction — one voice call builds up to
 *    4 oscillator+gain segments (voices fire ≤5/s in gameplay).
 * 3. PLAYSHRINK re-glide — regression parity with the legacy envelope bench
 *    (tests/audio.bench.ts) after the pitch-direction fix.
 *
 * Harness notes (same rationale as tests/audio.bench.ts): plain-JS fake
 * classes, NOT vi.fn() mocks — call-history retention would OOM a
 * multi-million-iteration bench worker. Absolute numbers are Node-on-M4
 * calling a JS fake: useful for budget headroom math and before/after
 * comparisons, NOT old-iPad predictions (see docs/perf-budgets.md).
 */

let oscCreated = 0;
let gainCreated = 0;

class BenchParam {
    setValueAtTime(_v: number, _t?: number) {}
    linearRampToValueAtTime(_v: number, _t?: number) {}
    exponentialRampToValueAtTime(_v: number, _t?: number) {}
}

class BenchNode extends BenchParam {
    frequency = new BenchParam();
    gain = new BenchParam();
    connect(_dest: unknown): BenchNode { return this; }
    disconnect() {}
    start(_t?: number) {}
    stop(_t?: number) {}
}

class BenchClockContext {
    /** Advanced ~one scheduler step per iteration to model wall-clock progress. */
    currentTime = 100;
    state: AudioContextState = 'running';
    destination = new BenchNode();
    resume(): Promise<void> { return Promise.resolve(); }
    createOscillator(): OscillatorNode { oscCreated++; return new BenchNode() as unknown as OscillatorNode; }
    createGain(): GainNode { gainCreated++; return new BenchNode() as unknown as GainNode; }
}

/** Internal-tick access: the scheduler pass is deliberately not public API. */
type TickableEngine = {
    runMusicTick(): void;
    musicPlaying: boolean;
    nextNoteTime: number;
};

function makeTickingEngine(ctx: BenchClockContext): TickableEngine {
    const engine = new AudioEngine({
        // Fresh engine bound to OUR clock; bypasses the muted/window gates
        // exactly as a real unmuted browser session would.
        contextFactory: () => ctx as unknown as AudioContext,
        rng: Math.random,
    }) as unknown as TickableEngine;
    engine.musicPlaying = true;
    engine.nextNoteTime = ctx.currentTime;
    return engine;
}

let sink: unknown;

describe('delight-audio.musicScheduler', () => {
    const ctx = new BenchClockContext();
    const engine = makeTickingEngine(ctx);

    bench('one lookahead tick (~500 ms of timeline, ~1 note)', () => {
        ctx.currentTime += 0.55;          // one nominal inter-note step of progress
        sink = engine.runMusicTick();     // schedules everything due within 2 s lookahead
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });
});

describe('delight-audio.animalVoiceConstruction', () => {
    const ctx = new BenchClockContext();
    const engine = new AudioEngine({ contextFactory: () => ctx as unknown as AudioContext });

    bench('playAnimalVoice("husky") — woof ×2 (lightest-mid, 2 osc + 2 gain)', () => {
        sink = engine.playAnimalVoice('husky');
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('playAnimalVoice("scorpion") — skitter ×4 (heaviest, 4 osc + 4 gain)', () => {
        sink = engine.playAnimalVoice('scorpion');
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });
});

describe('delight-audio.shrinkReglide', () => {
    const ctx = new BenchClockContext();
    const engine = new AudioEngine({ contextFactory: () => ctx as unknown as AudioContext });

    bench('playShrink — falling glide 900→250 Hz (post-fix parity)', () => {
        sink = engine.playShrink();
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });
});

export { sink as delightAudioBenchSink };
