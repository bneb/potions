import { bench, describe } from 'vitest';
import { audioEngine } from '@/lib/audio/audioEngine';

/**
 * Headless benchmark of the audioEngine param-envelope construction path.
 *
 * Feasibility note: this IS feasible headlessly. We install a plain
 * (non-vi.fn) fake AudioContext on window HERE — the engine reads
 * window.AudioContext lazily at first sound, never at import.
 *
 * Why not reuse tests/setup.ts's mock: its createOscillator/createGain are
 * shared vi.fn()s whose call history RETAINS every node ever constructed,
 * which OOMs a multi-million-iteration bench worker (~4GB heap). The plain
 * fake below records only aggregate counters, adds near-zero framework
 * overhead, and lets GC reclaim nodes between iterations.
 *
 * Absolute numbers reflect Node-on-Apple-M4 calling into a JS fake — useful
 * for relative before/after comparison and budget sanity checks, NOT as
 * old-iPad predictions (documented in docs/perf-budgets.md).
 */

let oscCreated = 0;
let gainCreated = 0;

class BenchFakeAudioParam {
    setValueAtTime(_v: number, _t: number) {}
    linearRampToValueAtTime(_v: number, _t: number) {}
    exponentialRampToValueAtTime(_v: number, _t: number) {}
}

class BenchFakeAudioNode {
    frequency = new BenchFakeAudioParam();
    gain = new BenchFakeAudioParam();
    connect(_dest: unknown): BenchFakeAudioNode { return this; }
    disconnect() {}
    start(_t?: number) {}
    stop(_t?: number) {}
}

class BenchFakeAudioContext {
    currentTime = 0;
    state: AudioContextState = 'running';
    destination = new BenchFakeAudioNode();
    resume(): Promise<void> { return Promise.resolve(); }
    suspend(): Promise<void> { return Promise.resolve(); }
    close(): Promise<void> { return Promise.resolve(); }
    createOscillator(): OscillatorNode { oscCreated++; return new BenchFakeAudioNode() as unknown as OscillatorNode; }
    createGain(): GainNode { gainCreated++; return new BenchFakeAudioNode() as unknown as GainNode; }
}

// Install BEFORE the engine's first lazy construction. Does not mutate
// tests/setup.ts; scoped to this worker process only.
(window as unknown as { AudioContext: unknown }).AudioContext = BenchFakeAudioContext;

let sink: unknown;

describe('audioEngine.envelopeConstruction (fake context)', () => {
    bench('playPop (1 osc + 1 gain)', () => {
        sink = audioEngine.playPop();
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('playGrowth (1 osc + 1 gain, ramps)', () => {
        sink = audioEngine.playGrowth();
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('playMagic (4 osc + 4 gain arpeggio)', () => {
        sink = audioEngine.playMagic();
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });

    bench('playRainbow (5 osc + 5 gain stack)', () => {
        sink = audioEngine.playRainbow();
    }, { warmupIterations: 20_000, warmupTime: 150, iterations: 300_000, time: 500 });
});

export { sink as audioBenchSink };
