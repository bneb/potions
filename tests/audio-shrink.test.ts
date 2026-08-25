import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '@/lib/audio/audioEngine';

/**
 * SHRINK PITCH CORRECTION (delight feature 3).
 *
 * "Shrink" must sound SMALLER: the pitch glide must FALL. The legacy engine
 * glided UP 400 → 1200 Hz, which reads as "growing" to a pre-reader.
 *
 * New contract:
 * - sine wave (same gentle timbre as before)
 * - falling glide ~900 Hz → ~250 Hz
 * - frequency events strictly monotonically DECREASING across the envelope
 * - same playful character/duration class as before (~0.25 s tail), peak
 *   gain still toddler-safe (≤0.25)
 */

interface FreqEvent {
    op: 'setValue' | 'linearRamp' | 'exponentialRamp';
    value: number;
}

function makeEngine() {
    const freqEvents: FreqEvent[] = [];
    const gainValues: number[] = [];

    const trackFreq = (op: FreqEvent['op']) =>
        vi.fn((value: number, _t?: number) => { freqEvents.push({ op, value }); });

    const osc = {
        type: '' as OscillatorType,
        frequency: {
            setValueAtTime: trackFreq('setValue'),
            linearRampToValueAtTime: trackFreq('linearRamp'),
            exponentialRampToValueAtTime: trackFreq('exponentialRamp'),
        },
        gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
    };
    const gain = {
        frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        gain: {
            setValueAtTime: vi.fn((v: number) => { gainValues.push(v); }),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
    };
    const ctx = {
        currentTime: 0,
        state: 'running' as AudioContextState,
        destination: { connect: vi.fn() },
        resume: vi.fn(async () => {}),
        createOscillator: vi.fn(() => osc),
        createGain: vi.fn(() => gain),
    };

    const engine = new AudioEngine({ contextFactory: () => ctx as unknown as AudioContext });
    return { engine, ctx, osc, gain, freqEvents, gainValues };
}

beforeEach(() => { vi.useRealTimers(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('playShrink: pitch must FALL for "smaller"', () => {
    it('glides DOWN: every scheduled frequency value is lower than the one before it', () => {
        const { engine, freqEvents } = makeEngine();
        engine.playShrink();

        expect(freqEvents.length).toBeGreaterThanOrEqual(2);
        const values = freqEvents.map(e => e.value);
        for (let i = 1; i < values.length; i++) {
            expect(
                values[i],
                `frequency event #${i} (${values[i]}) must be < previous (${values[i - 1]})`,
            ).toBeLessThan(values[i - 1]);
        }
    });

    it('starts near 900 Hz and lands near 250 Hz', () => {
        const { engine, freqEvents } = makeEngine();
        engine.playShrink();

        expect(freqEvents[0].op).toBe('setValue');
        expect(freqEvents[0].value).toBeGreaterThan(700);
        expect(freqEvents[0].value).toBeLessThan(1100);

        const last = freqEvents[freqEvents.length - 1];
        expect(last.op).toBe('exponentialRamp');
        expect(last.value).toBeGreaterThan(150);
        expect(last.value).toBeLessThan(400);
    });

    it('keeps the gentle sine timbre and a short playful tail (~0.2–0.3 s)', () => {
        const { engine, osc } = makeEngine();
        engine.playShrink();

        expect(osc.type).toBe('sine');
        // Envelope tail: stop time ≈ start + duration, duration in [0.18, 0.35] s
        const startArg = osc.start.mock.calls[0][0] as number;
        const stopArg = osc.stop.mock.calls[0][0] as number;
        const dur = stopArg - startArg;
        expect(dur).toBeGreaterThanOrEqual(0.18);
        expect(dur).toBeLessThanOrEqual(0.35);
    });

    it('stays toddler-safe: peak gain ≤ 0.25 and start/stop pairing intact', () => {
        const { engine, gainValues, osc } = makeEngine();
        engine.playShrink();

        for (const g of gainValues) expect(g).toBeLessThanOrEqual(0.25);
        expect(osc.start).toHaveBeenCalledTimes(1);
        expect(osc.stop).toHaveBeenCalledTimes(1);
        expect(osc.stop.mock.calls[0][0]).toBeGreaterThanOrEqual(osc.start.mock.calls[0][0] as number);
    });
});
