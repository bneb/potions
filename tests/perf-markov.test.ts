import { describe, it, expect } from 'vitest';
import { walkFx, FX_VISUALS } from '@/lib/markov';

/**
 * Contract tests for the Markov FX walk.
 *
 * walkFx gains an optional injectable RNG (`rng?: () => number`, default
 * Math.random) so walks are deterministic under a seeded generator — additive
 * and backward compatible. Both paths are tested here.
 */

const VALID_STATES = new Set(Object.keys(FX_VISUALS));

/** Deterministic PRNG (mulberry32); tiny, well-distributed, seedable. */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

describe('walkFx default path (Math.random)', () => {
    it('returns the requested number of steps of known states', () => {
        const path = walkFx(4);
        expect(path).toHaveLength(4);
        for (const fx of path) expect(VALID_STATES.has(fx)).toBe(true);
    });

    it('never repeats a state on consecutive steps (retry rule)', () => {
        for (let i = 0; i < 200; i++) {
            const path = walkFx(12);
            for (let j = 1; j < path.length; j++) {
                expect(path[j]).not.toBe(path[j - 1]);
            }
        }
    });
});

describe('walkFx injected RNG', () => {
    it('is fully deterministic for a fixed seed', () => {
        const a = walkFx(50, mulberry32(1234));
        const b = walkFx(50, mulberry32(1234));
        expect(a).toEqual(b);
    });

    it('differs across seeds (sanity)', () => {
        const a = walkFx(8, mulberry32(1));
        const b = walkFx(8, mulberry32(2));
        expect(a).not.toEqual(b);
    });

    it('produces only valid, non-repeating transitions at scale', () => {
        const path = walkFx(1000, mulberry32(42));
        expect(path).toHaveLength(1000);
        for (const fx of path) expect(VALID_STATES.has(fx)).toBe(true);
        for (let j = 1; j < path.length; j++) {
            expect(path[j]).not.toBe(path[j - 1]);
        }
    });

    it('rng receives only calls bounded by the walk (O(n) work)', () => {
        let calls = 0;
        const countingRng = () => { calls++; return 0; };
        walkFx(64, countingRng);
        // Exactly n calls: one for the start pick + (n-1) step picks. The
        // retry branch never fires because TRANSITIONS has no self-loops.
        expect(calls).toBe(64);
    });
});

describe('walkFx backward compatibility (vs pre-change algorithm)', () => {
    // Faithful copy of the original walkFx from before the injectable-rng
    // change (git show HEAD:app/lib/markov.ts). TRANSITIONS mirrored verbatim
    // from the module source (unchanged by the edit).
    const START_STATES_L = ['grow', 'rainbow', 'sparkle', 'float', 'red'];
    const TRANSITIONS_L: Record<string, [string, number][]> = {
        grow: [['giant', 3], ['rainbow', 2], ['sparkle', 2], ['shrink', 1]],
        giant: [['shrink', 3], ['sparkle', 2], ['float', 2]],
        shrink: [['grow', 3], ['float', 2], ['sparkle', 1], ['rainbow', 1]],
        rainbow: [['sparkle', 3], ['sunshine', 2], ['grow', 1], ['float', 1]],
        sparkle: [['rainbow', 3], ['sunshine', 2], ['grow', 1]],
        sunshine: [['sparkle', 2], ['rainbow', 2], ['grow', 1]],
        float: [['grow', 2], ['rainbow', 2], ['sparkle', 1], ['shrink', 1]],
        red: [['purple', 3], ['rainbow', 2], ['sparkle', 1]],
        purple: [['red', 3], ['rainbow', 2], ['float', 1]],
    };
    const pickL = <T,>(items: [T, number][], rng: () => number): T => {
        const total = items.reduce((s, [, w]) => s + w, 0);
        let r = rng() * total;
        for (const [item, w] of items) {
            r -= w;
            if (r <= 0) return item;
        }
        return items[items.length - 1][0];
    };
    const walkFxLegacy = (steps: number, rng: () => number): string[] => {
        const path: string[] = [START_STATES_L[Math.floor(rng() * START_STATES_L.length)]];
        while (path.length < steps) {
            const prev = path[path.length - 1];
            let n = pickL(TRANSITIONS_L[prev] ?? [['rainbow', 1]], rng);
            if (n === prev) n = pickL(TRANSITIONS_L[n] ?? [['rainbow', 1]], rng);
            path.push(n);
        }
        return path;
    };

    it('produces byte-identical walks to the original algorithm under the same rng stream', () => {
        for (let seed = 1; seed <= 300; seed++) {
            const rngA = mulberry32(seed);
            const rngB = mulberry32(seed);
            for (const steps of [1, 4, 7, 16]) {
                expect(walkFx(steps, rngA)).toEqual(walkFxLegacy(steps, rngB));
            }
        }
    });
});
