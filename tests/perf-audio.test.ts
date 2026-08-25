import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngine, audioEngine } from '@/lib/audio/audioEngine';

/**
 * Hardening tests for app/lib/audio/audioEngine.ts.
 *
 * The engine under test is a FRESH instance per test, built through the
 * optional constructor seam (`new AudioEngine({ contextFactory })`) so tests
 * never depend on jsdom's global window.AudioContext mock. The exported
 * `audioEngine` singleton keeps its original API and has its own dedicated
 * compatibility suite below.
 */

// --- Tracking fake --------------------------------------------------------

interface FakeNode {
    connectCalls: unknown[];
    starts: number[];
    stops: number[];
    frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
}

function makeFakeContext() {
    const oscillators: FakeNode[] = [];
    const gains: FakeNode[] = [];

    const makeParam = () => ({
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
    });

    const makeNode = (): FakeNode => ({
        connectCalls: [],
        starts: [],
        stops: [],
        frequency: makeParam(),
        gain: makeParam(),
    });

    const wire = (n: FakeNode): FakeNode => Object.assign(n, {
        connect(dest: unknown) { n.connectCalls.push(dest); return dest; },
        disconnect() {},
        start(t?: number) { n.starts.push(t ?? -1); },
        stop(t?: number) { n.stops.push(t ?? -1); },
    });

    const ctx = {
        currentTime: 0,
        state: 'suspended' as AudioContextState,
        destination: { connect: vi.fn(), disconnect: vi.fn() },
        resume: vi.fn(async () => { ctx.state = 'running'; }),
        suspend: vi.fn(async () => {}),
        close: vi.fn(async () => {}),
        createOscillator: vi.fn((): FakeNode => {
            const n = wire(makeNode());
            oscillators.push(n);
            return n;
        }),
        createGain: vi.fn((): FakeNode => {
            const n = wire(makeNode());
            gains.push(n);
            return n;
        }),
    };

    return {
        ctx,
        oscillators,
        gains,
        get totalNodesCreated() { return oscillators.length + gains.length; },
    };
}

type FakeHarness = ReturnType<typeof makeFakeContext>;

const ALL_PLAY_METHODS = [
    'playPop', 'playMagic', 'playGrowth', 'playShrink', 'playRainbow',
    'playRed', 'playPurple', 'playPresent', 'playSunshine', 'playHotdog',
    'playError',
] as const;

function makeEngine(): { engine: AudioEngine; harness: FakeHarness } {
    const harness = makeFakeContext();
    const engine = new AudioEngine({ contextFactory: () => harness.ctx as unknown as AudioContext });
    return { engine, harness };
}

beforeEach(() => {
    vi.useRealTimers();
});

afterEach(() => {
    vi.restoreAllMocks();
});

// --- (a) Mute master short-circuit ---------------------------------------

describe('setMuted / isMuted', () => {
    it('defaults to unmuted', () => {
        const { engine } = makeEngine();
        expect(engine.isMuted()).toBe(false);
    });

    it('muted play* constructs ZERO audio nodes', () => {
        const { engine, harness } = makeEngine();
        engine.setMuted(true);
        expect(engine.isMuted()).toBe(true);

        for (const m of ALL_PLAY_METHODS) {
            (engine as unknown as Record<string, () => void>)[m]();
        }
        expect(harness.ctx.createOscillator).not.toHaveBeenCalled();
        expect(harness.ctx.createGain).not.toHaveBeenCalled();
        expect(harness.totalNodesCreated).toBe(0);
    });

    it('unmuting restores normal node construction', () => {
        const { engine, harness } = makeEngine();
        engine.setMuted(true);
        engine.playPop();
        expect(harness.totalNodesCreated).toBe(0);

        engine.setMuted(false);
        engine.playPop();
        expect(harness.oscillators.length).toBe(1);
        expect(harness.gains.length).toBe(1);
    });

    it('mute short-circuits BEFORE touching the context (lazy ctx stays unconstructed)', () => {
        const factory = vi.fn(() => makeFakeContext().ctx as unknown as AudioContext);
        const engine = new AudioEngine({ contextFactory: factory });
        engine.setMuted(true);
        engine.playRainbow();
        expect(factory).not.toHaveBeenCalled();
    });
});

// --- (b) Lazy context creation / SSR safety -------------------------------

describe('lazy AudioContext lifecycle', () => {
    it('never creates a context at import time', async () => {
        let constructed = 0;
        class SpyAudioContext {
            constructor() { constructed++; }
            createOscillator() { return {}; }
        }
        const w = window as unknown as { AudioContext?: unknown };
        const prev = w.AudioContext;
        w.AudioContext = SpyAudioContext;
        try {
            vi.resetModules();
            await import('@/lib/audio/audioEngine');
            expect(constructed).toBe(0);
        } finally {
            w.AudioContext = prev;
        }
    });

    it('constructs the context lazily on first user-initiated sound, exactly once', () => {
        const factory = vi.fn(() => makeFakeContext().ctx as unknown as AudioContext);
        const engine = new AudioEngine({ contextFactory: factory });

        expect(factory).not.toHaveBeenCalled(); // construction is free

        engine.playGrowth();
        expect(factory).toHaveBeenCalledTimes(1);

        engine.playShrink();
        engine.playHotdog();
        expect(factory).toHaveBeenCalledTimes(1); // cached singleton context
    });

    it('init() resumes a suspended context (autoplay policy)', async () => {
        const { engine, harness } = makeEngine();
        await engine.init();
        expect(harness.ctx.resume).toHaveBeenCalled();
        expect(harness.ctx.state).toBe('running');
    });

    it('REGRESSION (old-iPad silence): playing into a suspended context kicks resume()', () => {
        const { engine, harness } = makeEngine();
        // Real browsers (esp. iOS Safari) can hand back a 'suspended' context
        // even when constructed inside a gesture; HEAD self-healed via
        // per-play init(). The hardened engine must keep doing so.
        harness.ctx.state = 'suspended';
        engine.playPop();
        expect(harness.ctx.resume).toHaveBeenCalled();
    });
});

// --- (d) Guard: missing / undefined AudioContext --------------------------

describe('missing AudioContext guard', () => {
    it('no-ops silently when window.AudioContext is undefined', () => {
        const w = window as unknown as { AudioContext?: unknown };
        const prev = w.AudioContext;
        w.AudioContext = undefined;
        try {
            const engine = new AudioEngine(); // no factory injected
            expect(() => engine.playPop()).not.toThrow();
            expect(() => engine.playMagic()).not.toThrow();
        } finally {
            w.AudioContext = prev;
        }
    });

    it('no-ops silently where window itself is absent (SSR)', () => {
        const g = globalThis as { window?: unknown };
        const prevWindow = g.window;
        const prevCtx = (g.window as { AudioContext?: unknown } | undefined)?.AudioContext;
        delete g.window;
        try {
            const engine = new AudioEngine();
            expect(() => engine.playError()).not.toThrow();
        } finally {
            g.window = prevWindow;
            if (prevWindow && (prevWindow as { AudioContext?: unknown })) {
                (prevWindow as { AudioContext?: unknown }).AudioContext = prevCtx;
            }
        }
    });

    it('a THROWING contextFactory degrades to a silent no-op (contract: play* never throws)', () => {
        const engine = new AudioEngine({
            contextFactory: () => { throw new Error('audio subsystem unavailable'); },
        });
        expect(() => engine.playPop()).not.toThrow();
        expect(() => engine.playRainbow()).not.toThrow();
    });
});

// --- (c) Oscillator start/stop pairing ------------------------------------

describe('oscillator lifecycle hygiene', () => {
    const SOUND_CASES: Array<[string, (e: AudioEngine) => void]> = [
        ['playPop', e => e.playPop()],
        ['playMagic', e => e.playMagic()],
        ['playGrowth', e => e.playGrowth()],
        ['playShrink', e => e.playShrink()],
        ['playRainbow', e => e.playRainbow()],
        ['playSunshine', e => e.playSunshine()],
        ['playHotdog', e => e.playHotdog()],
        ['playError', e => e.playError()],
    ];

    for (const [name, invoke] of SOUND_CASES) {
        it(`${name}: every osc.start has a matching osc.stop`, () => {
            const { engine, harness } = makeEngine();
            invoke(engine);
            expect(harness.oscillators.length).toBeGreaterThan(0);

            for (const osc of harness.oscillators) {
                expect(osc.stops.length, `${name}: started without stop`).toBe(osc.starts.length);
                for (let i = 0; i < osc.starts.length; i++) {
                    expect(osc.stops[i]).toBeGreaterThanOrEqual(osc.starts[i]);
                }
            }
        });

        it(`${name}: every osc connects to a gain and the gain reaches destination`, () => {
            const { engine, harness } = makeEngine();
            invoke(engine);
            expect(harness.oscillators.length).toBe(harness.gains.length);
            for (let i = 0; i < harness.oscillators.length; i++) {
                expect(harness.oscillators[i].connectCalls[0]).toBe(harness.gains[i]);
                expect(harness.gains[i].connectCalls[0]).toBe(harness.ctx.destination);
            }
        });
    }

    it('playPresent schedules its delayed chime via timer (existing design)', () => {
        vi.useFakeTimers();
        const { engine, harness } = makeEngine();
        engine.playPresent();
        expect(harness.oscillators.length).toBe(1); // pop now
        vi.advanceTimersByTime(150);
        expect(harness.oscillators.length).toBe(5); // pop + magic arpeggio (4)
        vi.useRealTimers();
    });

    it('muting between playPresent and its deferred chime yields ZERO nodes at fire time', () => {
        vi.useFakeTimers();
        const { engine, harness } = makeEngine();
        engine.playPresent(); // pop plays now (unmuted)
        expect(harness.oscillators.length).toBe(1);

        engine.setMuted(true); // mute BEFORE the 100ms timer fires
        vi.advanceTimersByTime(150);
        // The deferred playMagic must short-circuit: no new oscillators.
        expect(harness.oscillators.length).toBe(1);
        expect(harness.gains.length).toBe(1);
        vi.useRealTimers();
    });
});

// --- Backward compatibility of the singleton ------------------------------

describe('audioEngine singleton backward compatibility', () => {
    it('exposes the full historical method surface', () => {
        for (const m of ALL_PLAY_METHODS) {
            expect(typeof (audioEngine as unknown as Record<string, unknown>)[m]).toBe('function');
        }
        expect(typeof audioEngine.init).toBe('function');
    });

    it('still produces real audio graphs through the shared jsdom mock (node-count asserted)', () => {
        // setup.ts installs MockAudioContext on window; the singleton must
        // construct nodes through it, not silently no-op. We install our own
        // counting context so the assertion cannot pass vacuously.
        let oscCount = 0;
        const makeParam = () => ({
            setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(),
        });
        class CountingCtx {
            currentTime = 0;
            state: AudioContextState = 'running';
            destination = { connect: vi.fn(), disconnect: vi.fn() };
            resume = vi.fn(async () => {});
            createGain = vi.fn(() => ({
                gain: makeParam(), frequency: makeParam(),
                connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(),
            }));
            createOscillator = vi.fn(() => {
                oscCount++;
                return {
                    type: 'sine', frequency: makeParam(), gain: makeParam(),
                    connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(),
                };
            });
        }

        const w = window as unknown as { AudioContext?: unknown };
        const prev = w.AudioContext;
        w.AudioContext = CountingCtx;
        try {
            audioEngine.playPop();
            expect(oscCount).toBe(1);
        } finally {
            w.AudioContext = prev;
        }
    });

    it('is an instance of the (now exported) AudioEngine class', () => {
        expect(audioEngine).toBeInstanceOf(AudioEngine);
    });
});
