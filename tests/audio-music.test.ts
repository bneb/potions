import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngine, audioEngine } from '@/lib/audio/audioEngine';

/**
 * DELIGHT FEATURE 1 — generative music-box loop.
 *
 * Contracts under test:
 * - API (additive): startMusic(), stopMusic(), isMusicPlaying().
 * - ONE setTimeout lookahead chain (~500 ms per tick) schedules notes ~2 s
 *   ahead on the context timeline. Never rAF, never per-note timers.
 * - Injectable RNG (constructor option AND startMusic argument; default
 *   Math.random) pins determinism in tests.
 * - Musicality: C-major-pentatonic plucks only, sine/triangle timbres,
 *   per-note peak gain ≤0.05, fast attack + exponential decay (music-box
 *   character), tasteful rests / walk steps / occasional soft octave drop.
 * - Mute is structural: setMuted(true) stops the scheduler cleanly; while
 *   muted, startMusic constructs ZERO nodes and never touches a context.
 * - Idempotent startMusic (one timer chain, ever); stopMusic clears the
 *   timer and lets already-scheduled oscillators finish naturally; SSR /
 *   no-window is a silent no-op; hidden tab pauses scheduling.
 */

// --- Seeded RNG (mulberry32) ----------------------------------------------

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** The spec's pentatonic palette (C-major pentatonic, two registers). */
const PENTATONIC_HZ = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

const TICK_MS = 500;
const LOOKAHEAD_S = 2;

// --- Fake harness ----------------------------------------------------------

interface MusicNode {
    type?: string;
    frequency?: {
        setValueAtTime: (value: number, t?: number) => void;
        linearRampToValueAtTime: (value: number, t?: number) => void;
        exponentialRampToValueAtTime: (value: number, t?: number) => void;
    };
    gain?: {
        setValueAtTime: (value: number, t?: number) => void;
        linearRampToValueAtTime: (value: number, t?: number) => void;
        exponentialRampToValueAtTime: (value: number, t?: number) => void;
    };
    connectCalls: unknown[];
    starts: number[];
    stops: number[];
    frequencyEvents: Array<{ op: string; value: number; t: number }>;
    gainEvents: Array<{ op: string; value: number; t: number }>;
}

function makeHarness() {
    const oscillators: MusicNode[] = [];
    const gains: MusicNode[] = [];
    let currentTime = 10; // start away from 0 so timeline math is visible

    const recorder = (sink: Array<{ op: string; value: number; t: number }>, op: string) =>
        vi.fn((value: number, t: number = 0) => { sink.push({ op, value, t }); });

    const makeNode = (): MusicNode => {
        const frequencyEvents: MusicNode['frequencyEvents'] = [];
        const gainEvents: MusicNode['gainEvents'] = [];
        return {
            connectCalls: [], starts: [], stops: [], frequencyEvents, gainEvents,
            frequency: {
                setValueAtTime: recorder(frequencyEvents, 'setValue'),
                linearRampToValueAtTime: recorder(frequencyEvents, 'linearRamp'),
                exponentialRampToValueAtTime: recorder(frequencyEvents, 'exponentialRamp'),
            },
            gain: {
                setValueAtTime: recorder(gainEvents, 'setValue'),
                linearRampToValueAtTime: recorder(gainEvents, 'linearRamp'),
                exponentialRampToValueAtTime: recorder(gainEvents, 'exponentialRamp'),
            },
        };
    };

    const wire = (n: MusicNode): MusicNode => Object.assign(n, {
        connect(dest: unknown) { n.connectCalls.push(dest); return dest; },
        disconnect() {},
        start(t?: number) { n.starts.push(t ?? -1); },
        stop(t?: number) { n.stops.push(t ?? -1); },
    });

    const ctx = {
        get currentTime() { return currentTime; },
        set currentTime(v: number) { currentTime = v; },
        state: 'running' as AudioContextState,
        destination: { connect: vi.fn(), disconnect: vi.fn() },
        resume: vi.fn(async () => {}),
        createOscillator: vi.fn((): MusicNode => { const n = wire(makeNode()); oscillators.push(n); return n; }),
        createGain: vi.fn((): MusicNode => { const n = wire(makeNode()); gains.push(n); return n; }),
    };

    return {
        ctx, oscillators, gains,
        get totalNodes() { return oscillators.length + gains.length; },
    };
}

type Harness = ReturnType<typeof makeHarness>;

/** Advance wall-of-time: bump the audio clock, then fire one scheduler tick. */
function tickOnce(h: Harness) {
    h.ctx.currentTime += TICK_MS / 1000;
    vi.advanceTimersByTime(TICK_MS);
}

function engineOn(h: Harness, seed = 7): AudioEngine {
    return new AudioEngine({
        contextFactory: () => h.ctx as unknown as AudioContext,
        rng: mulberry32(seed),
    });
}

function setVisibility(state: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}
function restoreVisibility() {
    delete (document as unknown as { visibilityState?: string }).visibilityState;
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => {
    restoreVisibility();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

// --- API surface ------------------------------------------------------------

describe('music loop API surface (additive)', () => {
    it('exposes startMusic / stopMusic / isMusicPlaying on the class and singleton', () => {
        for (const target of [new AudioEngine(), audioEngine]) {
            expect(typeof (target as unknown as Record<string, unknown>).startMusic).toBe('function');
            expect(typeof (target as unknown as Record<string, unknown>).stopMusic).toBe('function');
            expect(typeof (target as unknown as Record<string, unknown>).isMusicPlaying).toBe('function');
        }
        expect(audioEngine.isMusicPlaying()).toBe(false);
    });
});

// --- Scheduling architecture -------------------------------------------------

describe('lookahead scheduler (ONE setTimeout chain)', () => {
    it('startMusic schedules its first notes immediately and reports playing', () => {
        const h = makeHarness();
        const engine = engineOn(h);
        engine.startMusic();
        expect(engine.isMusicPlaying()).toBe(true);
        expect(h.oscillators.length).toBeGreaterThan(0);
        engine.stopMusic();
    });

    it('keeps exactly ONE pending timer across ticks (no per-note timers)', () => {
        const h = makeHarness();
        const engine = engineOn(h);
        engine.startMusic();
        expect(vi.getTimerCount()).toBe(1);

        for (let i = 0; i < 6; i++) tickOnce(h);
        expect(vi.getTimerCount(), 'still exactly one chained timer').toBe(1);
        engine.stopMusic();
    });

    it('schedules ahead of the context timeline but never beyond the ~2 s horizon', () => {
        const h = makeHarness();
        const engine = engineOn(h, 11);
        engine.startMusic();

        for (let i = 0; i < 5; i++) {
            const nowAtCheck = h.ctx.currentTime + TICK_MS / 1000; // after next clock bump
            const scheduledStarts = h.oscillators.flatMap(o => o.starts);
            expect(scheduledStarts.length).toBeGreaterThan(0);
            for (const s of scheduledStarts) {
                // Every scheduled note lies within [now-ish, now + lookahead + one tick]
                expect(s).toBeGreaterThanOrEqual(nowAtCheck - LOOKAHEAD_S - TICK_MS / 1000);
                expect(s - nowAtCheck).toBeLessThanOrEqual(LOOKAHEAD_S + TICK_MS / 1000);
            }
            tickOnce(h);
        }
        engine.stopMusic();
    });

    it('note start times increase monotonically (timeline order)', () => {
        const h = makeHarness();
        const engine = engineOn(h, 3);
        engine.startMusic();
        for (let i = 0; i < 4; i++) tickOnce(h);
        engine.stopMusic();

        const starts = h.oscillators.map(o => o.starts[0]);
        for (let i = 1; i < starts.length; i++) {
            expect(starts[i]).toBeGreaterThanOrEqual(starts[i - 1]);
        }
    });
});

// --- Musicality ----------------------------------------------------------------

describe('musicality: pentatonic music-box plucks', () => {
    it('every note sits on the C-major pentatonic palette (seeded run)', () => {
        const h = makeHarness();
        const engine = engineOn(h, 42);
        engine.startMusic();
        for (let i = 0; i < 12; i++) tickOnce(h);
        engine.stopMusic();

        expect(h.oscillators.length).toBeGreaterThanOrEqual(8);
        for (const o of h.oscillators) {
            const f = o.frequencyEvents.find(e => e.op === 'setValue')?.value ?? -1;
            const isPentatonic = PENTATONIC_HZ.some(p => Math.abs(p - f) < 0.01);
            const isSoftOctaveDrop = PENTATONIC_HZ.some(p => Math.abs(p - f * 2) < 0.01);
            expect(isPentatonic || isSoftOctaveDrop,
                `${f} Hz is not pentatonic (nor a soft octave-down doubling of one)`).toBe(true);
        }
    });

    it('timbres stay soft (sine/triangle), peaks ≤0.05, fast attack + exponential music-box decay', () => {
        const h = makeHarness();
        const engine = engineOn(h, 99);
        engine.startMusic();
        for (let i = 0; i < 12; i++) tickOnce(h);
        engine.stopMusic();

        for (const o of h.oscillators) {
            expect(['sine', 'triangle']).toContain(o.type);
        }
        expect(h.gains.length).toBeGreaterThan(0);
        for (const g of h.gains) {
            const sets = g.gainEvents.filter(e => e.op === 'setValue');
            const attacks = g.gainEvents.filter(e => e.op === 'linearRamp');
            const decays = g.gainEvents.filter(e => e.op === 'exponentialRamp');
            expect(decays.length, 'music-box decay must be exponential').toBeGreaterThan(0);
            for (const e of g.gainEvents) {
                expect(e.value, `gain event ${e.op}=${e.value} exceeds whisper budget`).toBeLessThanOrEqual(0.05);
            }
            if (attacks.length > 0 && sets.length > 0) {
                expect(attacks[0].t - sets[0].t, 'attack must be fast (≤20 ms)').toBeLessThanOrEqual(0.02);
            }
        }
    });

    it('variation is real: two different seeds produce different melodies', () => {
        const a = collectMelody(1, 8);
        const b = collectMelody(2, 8);
        expect(a.length).toBeGreaterThan(0);
        expect(a).not.toEqual(b);
    });

    it('TASTE: the melody never stutters — no two consecutive plucks share a pitch (long seeded corpus)', () => {
        // The walk must ALWAYS move: a clamped ±2..+2 step includes delta=0,
        // and rail-clamping piles time onto the first/last scale degree —
        // measured stutter on the shipped clamp implementation: repeat rates
        // 20–33% across seeds with runs up to ELEVEN identical plucks
        // (~6 s of one note). A music box should strike onward; rests, not
        // repeated notes, provide the breathing. Structural guarantee beats
        // statistical thresholds here.
        const seeds = [1, 2, 3, 4, 5];
        for (const s of seeds) {
            const pitches = collectMelody(s, 300).map(n => n.f);
            expect(pitches.length).toBeGreaterThan(150);
            for (let i = 1; i < pitches.length; i++) {
                expect(
                    pitches[i],
                    `seed ${s}: pitch at position ${i} repeats its predecessor (stutter)`,
                ).not.toBe(pitches[i - 1]);
            }
        }
    });

    it('same seed → identical melody (deterministic via injectable RNG)', () => {
        expect(collectMelody(1234, 8)).toEqual(collectMelody(1234, 8));
    });

    it('RNG is injectable at startMusic time too (overrides constructor default)', () => {
        const hA = makeHarness();
        const hB = makeHarness();
        const eA = new AudioEngine({ contextFactory: () => hA.ctx as unknown as AudioContext }); // Math.random default
        const eB = new AudioEngine({ contextFactory: () => hB.ctx as unknown as AudioContext });
        const seq = [0.5, 0.9, 0.1, 0.7, 0.3, 0.6, 0.2, 0.8];
        let i = 0;
        const pinned = () => seq[i++ % seq.length];
        eA.startMusic(pinned);
        i = 0;
        eB.startMusic(pinned);
        const melodyA = hA.oscillators.map(o => o.frequencyEvents[0].value);
        const melodyB = hB.oscillators.map(o => o.frequencyEvents[0].value);
        expect(melodyA).toEqual(melodyB);
        expect(melodyA.length).toBeGreaterThan(0);
        eA.stopMusic(); eB.stopMusic();
    });

    function collectMelody(seed: number, ticks: number) {
        const h = makeHarness();
        const engine = engineOn(h, seed);
        engine.startMusic();
        for (let i = 0; i < ticks; i++) tickOnce(h);
        engine.stopMusic();
        return h.oscillators.map(o => ({
            f: o.frequencyEvents.find(e => e.op === 'setValue')?.value,
            s: o.starts[0],
        }));
    }
});

// --- Mute gating -----------------------------------------------------------------

describe('mute interaction with music', () => {
    it('muted BEFORE startMusic: zero nodes, zero timers, factory never called', () => {
        let constructions = 0;
        const h = makeHarness();
        const engine = new AudioEngine({
            contextFactory: () => { constructions++; return h.ctx as unknown as AudioContext; },
        });
        engine.setMuted(true);
        engine.startMusic();

        expect(engine.isMusicPlaying()).toBe(false);
        expect(constructions).toBe(0);
        expect(h.totalNodes).toBe(0);
        expect(vi.getTimerCount()).toBe(0);

        vi.advanceTimersByTime(TICK_MS * 10);
        expect(h.totalNodes).toBe(0);
    });

    it('mute RACE while playing: music stops cleanly, no NEW nodes afterwards', () => {
        const h = makeHarness();
        const engine = engineOn(h);
        engine.startMusic();
        expect(h.totalNodes).toBeGreaterThan(0);
        const frozen = h.totalNodes;

        engine.setMuted(true);
        expect(engine.isMusicPlaying()).toBe(false);
        expect(vi.getTimerCount()).toBe(0);

        for (let i = 0; i < 6; i++) tickOnce(h);
        expect(h.totalNodes).toBe(frozen);
    });

    it('unmuting does NOT silently resurrect music (component calls startMusic again)', () => {
        const h = makeHarness();
        const engine = engineOn(h);
        engine.startMusic();
        engine.setMuted(true);
        engine.setMuted(false);
        expect(engine.isMusicPlaying()).toBe(false);

        // Explicit restart works.
        engine.startMusic();
        expect(engine.isMusicPlaying()).toBe(true);
        expect(h.totalNodes).toBeGreaterThan(0);
        engine.stopMusic();
    });

    it('COMPONENT LIFECYCLE CONTRACT: muting halts scheduling WITHOUT firing the public stopMusic', () => {
        // Game.tsx owns the music lifecycle around mute transitions: it calls
        // stopMusic() itself, exactly once, when the parent mutes. The
        // engine's internal mute handling must therefore take a PRIVATE halt
        // path — an integration spy on stopMusic must see ONLY the
        // component's call, never an engine-internal echo.
        const h = makeHarness();
        const engine = engineOn(h);
        engine.startMusic();
        expect(h.totalNodes).toBeGreaterThan(0);

        const stopSpy = vi.spyOn(engine, 'stopMusic');
        const frozen = h.totalNodes;

        engine.setMuted(true);

        expect(stopSpy, 'engine must not re-enter the public stopMusic on mute').not.toHaveBeenCalled();
        expect(engine.isMusicPlaying()).toBe(false);
        expect(vi.getTimerCount(), 'scheduler chain is still torn down privately').toBe(0);

        for (let i = 0; i < 4; i++) tickOnce(h);
        expect(h.totalNodes).toBe(frozen);

        // The component's OWN explicit stopMusic keeps working normally.
        stopSpy.mockClear();
        engine.stopMusic();
        expect(stopSpy).toHaveBeenCalledTimes(1);
    });
});

// -- Lifecycle hygiene ------------------------------------------------------------

describe('start/stop lifecycle hygiene', () => {
    it('multiple startMusic calls are idempotent (one timer chain, single scheduler rate)', () => {
        const h = makeHarness();
        const engine = engineOn(h);
        engine.startMusic();
        engine.startMusic();
        engine.startMusic();

        expect(vi.getTimerCount()).toBe(1);

        for (let i = 0; i < 10; i++) tickOnce(h);
        // One chain ≈ 5 s → ~9 steps × ≤2 notes; a duplicated chain would blow past 40 nodes.
        expect(h.oscillators.length).toBeLessThanOrEqual(40);
        engine.stopMusic();
    });

    it('stopMusic clears the timer; advancing time schedules nothing more', () => {
        const h = makeHarness();
        const engine = engineOn(h);
        engine.startMusic();
        expect(vi.getTimerCount()).toBe(1);
        const frozen = h.totalNodes;

        engine.stopMusic();
        expect(engine.isMusicPlaying()).toBe(false);
        expect(vi.getTimerCount(), 'timer must be cleared').toBe(0);

        vi.advanceTimersByTime(TICK_MS * 10);
        expect(h.totalNodes).toBe(frozen);
    });

    it('stopMusic leaves already-scheduled oscillators to finish naturally (no extra stops)', () => {
        const h = makeHarness();
        const engine = engineOn(h);
        engine.startMusic();
        const stopsBefore = h.oscillators.map(o => o.stops.length);
        engine.stopMusic();
        const stopsAfter = h.oscillators.map(o => o.stops.length);
        expect(stopsAfter).toEqual(stopsBefore);
    });

    it('stopMusic without start is a safe no-op; restart after stop works', () => {
        const h = makeHarness();
        const engine = engineOn(h);
        expect(() => engine.stopMusic()).not.toThrow();

        engine.startMusic();
        engine.stopMusic();
        engine.startMusic();
        expect(engine.isMusicPlaying()).toBe(true);
        expect(h.totalNodes).toBeGreaterThan(0);
        engine.stopMusic();
    });

    it('STRESS: 20 rapid start/mute/unmute cycles never arm two chains nor leak timers', () => {
        const h = makeHarness();
        const engine = engineOn(h);

        for (let i = 0; i < 20; i++) {
            engine.startMusic();
            expect(vi.getTimerCount(), `cycle ${i}: at most one chain`).toBeLessThanOrEqual(1);
            engine.setMuted(true);
            expect(vi.getTimerCount(), `cycle ${i}: mute tears the chain down`).toBe(0);
            engine.setMuted(false);
            // Unmute alone must not resurrect anything…
            expect(vi.getTimerCount()).toBe(0);
            expect(engine.isMusicPlaying()).toBe(false);
        }

        // …and a final explicit restart behaves normally.
        engine.startMusic();
        expect(vi.getTimerCount()).toBe(1);
        expect(h.totalNodes).toBeGreaterThan(0);
        engine.stopMusic();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('a permanently-throwing contextFactory makes startMusic a silent inert no-op', () => {
        const engine = new AudioEngine({
            contextFactory: () => { throw new Error('audio subsystem unavailable'); },
        });
        expect(() => engine.startMusic()).not.toThrow();
        expect(engine.isMusicPlaying()).toBe(false);
        expect(vi.getTimerCount()).toBe(0);
        vi.advanceTimersByTime(TICK_MS * 6);
        expect(vi.getTimerCount()).toBe(0); // no zombie chain retrying forever
    });
});

// -- Environment robustness ----------------------------------------------------------

describe('environment robustness', () => {
    it('SSR / no-window: silent no-op, never throws, no timers armed', () => {
        const g = globalThis as { window?: unknown };
        const prev = g.window;
        delete g.window;
        try {
            const engine = new AudioEngine();
            expect(() => engine.startMusic()).not.toThrow();
            expect(engine.isMusicPlaying()).toBe(false);
            expect(() => engine.stopMusic()).not.toThrow();
            expect(vi.getTimerCount()).toBe(0);
        } finally {
            g.window = prev;
        }
    });

    it('hidden tab pauses scheduling; visible resumes; timer stays alive throughout', () => {
        const h = makeHarness();
        const engine = engineOn(h);
        setVisibility('visible');
        engine.startMusic();
        expect(h.totalNodes).toBeGreaterThan(0);

        setVisibility('hidden');
        const frozen = h.totalNodes;
        for (let i = 0; i < 4; i++) tickOnce(h);
        expect(h.totalNodes, 'nothing scheduled while hidden').toBe(frozen);
        expect(vi.getTimerCount(), 'timer stays armed while hidden').toBe(1);

        setVisibility('visible');
        tickOnce(h);
        expect(h.totalNodes).toBeGreaterThan(frozen);
        engine.stopMusic();
    });

    it('resume after hidden snaps the melodic clock forward (no burst catch-up dump)', () => {
        const h = makeHarness();
        const engine = engineOn(h);
        setVisibility('visible');
        engine.startMusic();

        setVisibility('hidden');
        for (let i = 0; i < 8; i++) tickOnce(h); // ~4 s hidden, clock keeps advancing
        setVisibility('visible');

        const before = h.totalNodes;
        tickOnce(h);
        // After resume, at most one tick worth (~2 steps) may be scheduled — not 8 ticks' worth.
        expect(h.totalNodes - before).toBeLessThanOrEqual(6);
        engine.stopMusic();
    });

    it('SELF-HEAL: a context suspended MID-SESSION gets resume() kicked again on later ticks', () => {
        // iOS reality: FaceTime/Siri/app-switch interrupts suspend the CACHED
        // context long after construction. The construction-path resume is
        // gone by then — the scheduler (and every play*) must re-kick
        // resume() while the page is visible, or the game goes permanently
        // silent while isMusicPlaying() lies.
        const h = makeHarness();
        const engine = engineOn(h);
        engine.startMusic();
        const kicksAfterConstruction = h.ctx.resume.mock.calls.length;

        (h.ctx as { state: AudioContextState }).state = 'suspended'; // phone call arrives
        tickOnce(h);

        expect(
            h.ctx.resume.mock.calls.length,
            'scheduler tick must attempt recovery of a suspended cached context',
        ).toBeGreaterThan(kicksAfterConstruction);
        expect(engine.isMusicPlaying()).toBe(true);

        // Recovery is fire-and-forget: once running again, no more kicking.
        (h.ctx as { state: AudioContextState }).state = 'running';
        const kicksWhileRunning = h.ctx.resume.mock.calls.length;
        tickOnce(h);
        expect(h.ctx.resume.mock.calls.length).toBe(kicksWhileRunning);
        engine.stopMusic();
    });

    it('SELF-HEAL respects backgrounded tabs: no resume spam while hidden', () => {
        const h = makeHarness();
        const engine = engineOn(h);
        engine.startMusic();
        (h.ctx as { state: AudioContextState }).state = 'suspended';
        setVisibility('hidden');
        const kicks = h.ctx.resume.mock.calls.length;
        for (let i = 0; i < 4; i++) tickOnce(h);
        expect(h.ctx.resume.mock.calls.length).toBe(kicks);
        engine.stopMusic();
    });

    it('ERROR TEARDOWN: an rng that starts throwing mid-session stops the RUNNING chain cleanly', () => {
        // Covers the in-chain catch (armMusicTimer callback): a live chain
        // whose scheduling blows up must tear itself down — timer cleared,
        // flag false, zero further nodes — never spin an error loop.
        const h = makeHarness();
        let draws = 0;
        const bombRng = () => {
            draws++;
            if (draws > 40) throw new Error('rng exploded mid-session');
            return 0.5;
        };
        const engine = new AudioEngine({
            contextFactory: () => h.ctx as unknown as AudioContext,
            rng: bombRng,
        });
        engine.startMusic();
        // The first (synchronous) pass must survive — the chain is armed.
        expect(engine.isMusicPlaying()).toBe(true);
        expect(vi.getTimerCount()).toBe(1);

        for (let i = 0; i < 10 && vi.getTimerCount() > 0; i++) tickOnce(h);

        expect(vi.getTimerCount(), 'chain must self-tear-down after in-tick errors').toBe(0);
        expect(engine.isMusicPlaying()).toBe(false);
        // (The fatal pass may have partially scheduled before dying; what
        // matters is nothing EVER happens again afterwards.)
        const afterDeath = h.totalNodes;
        for (let i = 0; i < 6; i++) tickOnce(h);
        expect(h.totalNodes).toBe(afterDeath);
    });

    it('ENVELOPE AUDIT: no exponentialRamp ever starts from exact zero (real WebAudio NaN hazard)', () => {
        // The 0.0001 floors are load-bearing: exponentialRampToValueAtTime
        // from an exactly-zero prior value throws or produces silence/NaN on
        // real contexts. Audit EVERY envelope we build — music plucks,
        // animal voices, and shrink.
        const auditNode = (n: { gainEvents: Array<{ op: string; value: number }> }, label: string) => {
            let lastSet = -1;
            for (const e of n.gainEvents) {
                if (e.op === 'setValue' || e.op === 'linearRamp') lastSet = e.value;
                if (e.op === 'exponentialRamp') {
                    expect(lastSet, `${label}: exponential ramp from ${lastSet}`).toBeGreaterThan(0);
                }
            }
        };

        const hm = makeHarness();
        const em = engineOn(hm, 5);
        em.startMusic();
        for (let i = 0; i < 6; i++) tickOnce(hm);
        em.stopMusic();
        hm.gains.forEach((g, i) => auditNode(g, `pluck ${i}`));

        const hv = makeHarness();
        const ev = new AudioEngine({ contextFactory: () => hv.ctx as unknown as AudioContext });
        for (const id of ['husky', 'scorpion', 'santa'] as const) ev.playAnimalVoice(id);
        hv.gains.forEach((g, i) => auditNode(g, `voice segment ${i}`));
        expect(hv.gains.length).toBeGreaterThan(0);
    });
});
