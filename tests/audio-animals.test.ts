import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '@/lib/audio/audioEngine';
import { ANIMALS } from '@/lib/data';
import { AnimalVoiceSchema, type AnimalId, type AnimalVoice } from '@/lib/schemas';

/**
 * DELIGHT FEATURE 2 — per-animal voices for pre-readers.
 *
 * Contracts under test:
 * - ADDITIVE data/schema change: every ANIMALS entry carries a `voice`
 *   config validating against AnimalVoiceSchema; nothing else changed shape.
 * - SAFETY near toddler ears: every segment ≤350 ms, peak gain ≤0.25,
 *   frequencies kept out of harsh blast territory (≤2000 Hz), total voice
 *   span ≤1.2 s.
 * - DISTINCT BY EAR: any two species differ in timbre (wave), rhythm
 *   (repeats), register (frequency ratio ≥1.25), or glide direction — a
 *   pre-reader who cannot read "Husky" can still hear "not the T-Rex".
 * - ENGINE: playAnimalVoice(id) builds exactly `repeats` oscillator+gain
 *   pairs through the shared envelope plumbing (connect chain, start/stop
 *   pairing, staggered segments), is mute-gated with ZERO nodes, SSR-safe,
 *   and silently tolerates unknown ids.
 */

// --- Fake context (same approach as tests/perf-audio.test.ts) -------------

interface TrackedNode {
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
    const oscillators: TrackedNode[] = [];
    const gains: TrackedNode[] = [];
    let currentTime = 0;

    const makeParamRecorder = (
        sink: TrackedNode['frequencyEvents'],
        op: 'setValue' | 'linearRamp' | 'exponentialRamp',
    ) =>
        vi.fn((value: number, t: number = 0) => {
            sink.push({ op, value, t });
        });

    const makeNode = (): TrackedNode => {
        const frequencyEvents: TrackedNode['frequencyEvents'] = [];
        const gainEvents: TrackedNode['gainEvents'] = [];
        return {
            connectCalls: [],
            starts: [],
            stops: [],
            frequencyEvents,
            gainEvents,
            frequency: {
                setValueAtTime: makeParamRecorder(frequencyEvents, 'setValue'),
                linearRampToValueAtTime: makeParamRecorder(frequencyEvents, 'linearRamp'),
                exponentialRampToValueAtTime: makeParamRecorder(frequencyEvents, 'exponentialRamp'),
            },
            gain: {
                setValueAtTime: makeParamRecorder(gainEvents, 'setValue'),
                linearRampToValueAtTime: makeParamRecorder(gainEvents, 'linearRamp'),
                exponentialRampToValueAtTime: makeParamRecorder(gainEvents, 'exponentialRamp'),
            },
        };
    };

    const wire = (n: TrackedNode): TrackedNode =>
        Object.assign(n, {
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
        createOscillator: vi.fn((): TrackedNode => {
            const n = wire(makeNode());
            oscillators.push(n);
            return n;
        }),
        createGain: vi.fn((): TrackedNode => {
            const n = wire(makeNode());
            gains.push(n);
            return n;
        }),
    };

    const engine = new AudioEngine({ contextFactory: () => ctx as unknown as AudioContext });
    return { engine, ctx, oscillators, gains };
}

const UNVOICED = ANIMALS.filter(a => !a.voice);
const VOICES = ANIMALS.map(a => ({ id: a.id, name: a.name, voice: a.voice as AnimalVoice }));

// --- Data / schema contracts ----------------------------------------------

describe('ANIMALS voice configs (data + schema, additive)', () => {
    it('every one of the 8 animals carries a voice that validates against AnimalVoiceSchema', () => {
        expect(ANIMALS).toHaveLength(8);
        expect(UNVOICED, `missing voices: ${UNVOICED.map(a => a.id).join(', ')}`).toHaveLength(0);
        for (const { id, voice } of VOICES) {
            expect(() => AnimalVoiceSchema.parse(voice)).not.toThrow();
        }
    });

    it('table: every voice is SHORT and GENTLE (≤350 ms/segment, peak ≤0.25, ≤2000 Hz, span ≤1.2 s)', () => {
        // prettier-ignore
        const cases: Array<[AnimalId, AnimalVoice]> = VOICES.map(({ id, voice }) => [id, voice as AnimalVoice]);
        expect(cases.length).toBe(8);

        for (const [id, v] of cases) {
            expect(v.durationMs, `${id} segment too long`).toBeLessThanOrEqual(350);
            expect(v.durationMs, `${id} segment absurdly short`).toBeGreaterThanOrEqual(40);
            expect(v.peakGain, `${id} too loud for toddler ears`).toBeLessThanOrEqual(0.25);
            expect(v.peakGain).toBeGreaterThan(0);
            expect(Math.max(v.freqStart, v.freqEnd), `${id} harsh high-frequency blast`).toBeLessThanOrEqual(2000);
            expect(v.freqStart, `${id} freq must be audible`).toBeGreaterThanOrEqual(30);
            expect(v.freqEnd).toBeGreaterThanOrEqual(30);
            expect(v.repeats ?? 1).toBeLessThanOrEqual(4);

            const repeats = v.repeats ?? 1;
            const span = repeats * v.durationMs + (repeats - 1) * (v.gapMs ?? 0);
            expect(span, `${id} whole call drags on`).toBeLessThanOrEqual(1200);
        }
    });

    it('table: every voice stays audible on tablet speakers (wave-aware register floor)', () => {
        // Tablet/phone speakers roll off hard below ~150–200 Hz. Harmonic-rich
        // waves (square/sawtooth) survive as buzz down to ~65 Hz; nearly-pure
        // waves (sine/triangle) effectively vanish there — their fundamentals
        // must stay ≥110 Hz or the species goes silent for the kid holding
        // the iPad.
        const floorFor = (w: AnimalVoice['wave']) => (w === 'square' || w === 'sawtooth' ? 65 : 110);
        for (const { id, voice } of VOICES) {
            const floor = floorFor(voice.wave);
            expect(Math.min(voice.freqStart, voice.freqEnd),
                `${id}: ${voice.wave} at ${Math.min(voice.freqStart, voice.freqEnd)} Hz is inaudible on a tablet`).toBeGreaterThanOrEqual(floor);
            expect(Math.max(voice.freqStart, voice.freqEnd)).toBeLessThanOrEqual(2000);
        }
    });

    it('table: every voice is distinct enough for a pre-reader to tell species apart', () => {
        // Separation must be STRUCTURAL (timbre / rhythm / glide direction /
        // pace) or a genuine register gulf (centers ≥5 semitones apart).
        // Raw linear-Hz ratios on fundamentals are not perceivable guarantees;
        // semitone distance between geometric-mean centers is.
        const center = (v: AnimalVoice) => Math.sqrt(v.freqStart * v.freqEnd);
        const semitones = (a: AnimalVoice, b: AnimalVoice) =>
            12 * Math.log2(Math.max(center(a), center(b)) / Math.min(center(a), center(b)));
        const distinct = (a: AnimalVoice, b: AnimalVoice): boolean => {
            if (a.wave !== b.wave) return true;                       // timbre
            if ((a.repeats ?? 1) !== (b.repeats ?? 1)) return true;   // rhythm
            const dMax = Math.max(a.durationMs, b.durationMs);
            if (Math.abs(a.durationMs - b.durationMs) > dMax * 0.3) return true; // pace
            const dirA = Math.sign(a.freqEnd - a.freqStart);
            const dirB = Math.sign(b.freqEnd - b.freqStart);
            if (dirA !== dirB && dirA !== 0 && dirB !== 0) return true;          // glide direction
            return semitones(a, b) >= 5;                                          // register gulf
        };

        for (let i = 0; i < VOICES.length; i++) {
            for (let j = i + 1; j < VOICES.length; j++) {
                const a = VOICES[i].voice as AnimalVoice;
                const b = VOICES[j].voice as AnimalVoice;
                expect(
                    distinct(a, b),
                    `${VOICES[i].id} and ${VOICES[j].id} sound too alike ` +
                    `(semitones=${semitones(a, b).toFixed(1)})`,
                ).toBe(true);
            }
        }
    });

    it('SCHEMA RAILS: the schema itself rejects voices that drag on (>1.2 s total span)', () => {
        // Per-field limits alone allow 4×350 ms segments + 3×400 ms gaps ≈
        // 2.6 s of scheduled sound — the "whole call ≤1.2 s" safety rail must
        // be enforced BY THE SCHEMA, not just by today's data happening to be
        // small.
        const base = { preset: 'woof', wave: 'triangle', freqStart: 300, freqEnd: 150, durationMs: 350, peakGain: 0.2 };
        expect(
            AnimalVoiceSchema.safeParse({ ...base, repeats: 4, gapMs: 400 }).success,
            '4×350ms + 3×400ms ≈ 2.6s must be rejected',
        ).toBe(false);
        expect(AnimalVoiceSchema.safeParse({ ...base, repeats: 3, gapMs: 100 }).success, // 3×350+2×100=1250>1200
            'just-over-span config must be rejected').toBe(false);
        expect(AnimalVoiceSchema.safeParse({ ...base, repeats: 2, gapMs: 120 }).success).toBe(true); // 820ms ok
    });

    it('SCHEMA RAILS: consecutive segments need a release gap — gapMs < 25 with repeats is rejected', () => {
        // Each segment's gain tail extends ~20 ms past its nominal end; a
        // smaller gap makes adjacent segments overlap into one smeared blob.
        const base = { preset: 'woof', wave: 'triangle', freqStart: 300, freqEnd: 150, durationMs: 150, peakGain: 0.2 };
        expect(AnimalVoiceSchema.safeParse({ ...base, repeats: 2, gapMs: 10 }).success,
            '10 ms gap < 20 ms release tail → overlap').toBe(false);
        expect(AnimalVoiceSchema.safeParse({ ...base, repeats: 1 }).success).toBe(true); // no adjacency, no constraint
    });

    it('ENGINE GUARD: even a schema-bypassing oversized config gets clamped to ≤~1.3 s of scheduled sound', () => {
        // Defense in depth: playAnimalVoice clamps whatever reaches it, so a
        // hand-built or stale-data config cannot schedule a 2.6 s call.
        const { engine, oscillators } = makeHarness();
        const intruder = {
            id: 'manticores',
            name: 'Test Manticore',
            imageSrc: '/assets/x.png',
            voice: { preset: 'roar', wave: 'sawtooth', freqStart: 200, freqEnd: 80, durationMs: 350, peakGain: 0.2, repeats: 4, gapMs: 400 },
        } as unknown as (typeof ANIMALS)[number];
        ANIMALS.push(intruder);
        try {
            engine.playAnimalVoice('manticores' as never);
        } finally {
            ANIMALS.pop();
        }
        const first = Math.min(...oscillators.map(o => o.starts[0]));
        const last = Math.max(...oscillators.map(o => o.stops[0]));
        expect(last - first, 'clamped whole-call span').toBeLessThanOrEqual(1.35);
    });
});

// --- Engine behaviour ------------------------------------------------------

beforeEach(() => { vi.useRealTimers(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('playAnimalVoice engine behaviour', () => {
    it.each(VOICES.map(v => [v.id, v.voice]))(
        '%s: builds exactly `repeats` envelope pairs with configured glide, gain and pairing',
        (id, voice) => {
            const { engine, ctx, oscillators, gains } = makeHarness();
            engine.playAnimalVoice(id);

            const repeats = voice.repeats ?? 1;
            expect(oscillators.length).toBe(repeats);
            expect(gains.length).toBe(repeats);

            const segS = voice.durationMs / 1000;
            const gapS = (voice.gapMs ?? 0) / 1000;

            for (let i = 0; i < repeats; i++) {
                const osc = oscillators[i];
                const gain = gains[i];
                const expectedStart = i * (segS + gapS);

                // Timbre + glide endpoints per segment
                expect(osc.type).toBe(voice.wave);
                expect(osc.frequencyEvents.some(e => e.op === 'setValue' && e.value === voice.freqStart)).toBe(true);
                expect(osc.frequencyEvents.some(e => e.op === 'exponentialRamp' && e.value === voice.freqEnd)).toBe(true);

                // Gentle attack then exponential decay to silence (envelope
                // lives on the gain node)
                const setG = gain.gainEvents.filter(e => e.op === 'setValue');
                expect(setG[0].value).toBeLessThanOrEqual(voice.peakGain);
                expect(gain.gainEvents.some(e => e.value === voice.peakGain)).toBe(true);

                // Wiring + start/stop pairing
                expect(osc.connectCalls[0]).toBe(gain);
                expect(gain.connectCalls[0]).toBe(ctx.destination);
                expect(osc.stops.length).toBe(osc.starts.length);
                expect(osc.starts[0]).toBeCloseTo(expectedStart, 5);
                expect(osc.stops[0]).toBeGreaterThanOrEqual(osc.starts[0]);

                // Segment length honours the ≤350 ms budget
                expect(osc.stops[0] - osc.starts[0]).toBeLessThanOrEqual((voice.durationMs + 100) / 1000);
            }

            // Segments do not overlap
            for (let i = 1; i < repeats; i++) {
                expect(oscillators[i].starts[0]).toBeGreaterThanOrEqual(oscillators[i - 1].stops[0]);
            }
        },
    );

    it('whole-call span never exceeds ~1.2 s for any animal', () => {
        for (const { id } of VOICES) {
            const { engine, oscillators } = makeHarness();
            engine.playAnimalVoice(id);
            const first = Math.min(...oscillators.map(o => o.starts[0]));
            const last = Math.max(...oscillators.map(o => o.stops[0]));
            expect(last - first, `${id} call too long`).toBeLessThanOrEqual(1.3);
        }
    });

    it('muted: constructs ZERO nodes and never touches the context factory', () => {
        const factory = vi.fn(() => makeHarness().ctx as unknown as AudioContext);
        const engine = new AudioEngine({ contextFactory: factory });
        engine.setMuted(true);
        for (const { id } of VOICES) engine.playAnimalVoice(id);
        expect(factory).not.toHaveBeenCalled();
    });

    it('unmuting restores voices', () => {
        const { engine, oscillators } = makeHarness();
        engine.setMuted(true);
        engine.playAnimalVoice('husky');
        expect(oscillators.length).toBe(0);
        engine.setMuted(false);
        engine.playAnimalVoice('husky');
        expect(oscillators.length).toBe(2); // woof-woof
    });

    it('SSR / no-window: silent no-op, never throws', () => {
        const g = globalThis as { window?: unknown };
        const prev = g.window;
        delete g.window;
        try {
            const engine = new AudioEngine();
            for (const { id } of VOICES) expect(() => engine.playAnimalVoice(id)).not.toThrow();
        } finally {
            g.window = prev;
        }
    });

    it('unknown id degrades to a silent no-op (defensive, runtime-guarded)', () => {
        const { engine, oscillators } = makeHarness();
        expect(() => engine.playAnimalVoice('unicorn' as unknown as AnimalId)).not.toThrow();
        expect(oscillators.length).toBe(0);
    });
});
