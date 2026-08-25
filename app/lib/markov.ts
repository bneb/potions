"use client";

// Markov-chain "walking path" of visual effects for the Surprise button.
// Each state is a self-contained transform the game applies to the selected
// animals. Transitions are hand-weighted so a walk always flows into something
// new and never dead-ends or lands on a scary/hidden state.

export type FxSound = 'growth' | 'shrink' | 'magic' | 'rainbow' | 'sunshine';

export interface FxVisual {
    scale: number;
    filter: string;
    classes: string[];
    sound: FxSound;
}

export const FX_VISUALS: Record<string, FxVisual> = {
    grow: { scale: 1.35, filter: '', classes: ['animate-pulse-grow'], sound: 'growth' },
    giant: { scale: 1.6, filter: '', classes: ['animate-wiggle'], sound: 'growth' },
    shrink: { scale: 0.6, filter: '', classes: ['animate-shrink-bounce'], sound: 'shrink' },
    rainbow: { scale: 1, filter: '', classes: ['animate-rainbow'], sound: 'rainbow' },
    sparkle: { scale: 1.1, filter: '', classes: ['animate-sparkle'], sound: 'sunshine' },
    sunshine: { scale: 1, filter: 'sepia(1) saturate(6) hue-rotate(0deg) drop-shadow(0 0 15px gold)', classes: [], sound: 'sunshine' },
    float: { scale: 1, filter: '', classes: ['animate-float'], sound: 'magic' },
    red: { scale: 1, filter: 'sepia(1) saturate(5) hue-rotate(-50deg)', classes: [], sound: 'magic' },
    purple: { scale: 1, filter: 'sepia(1) saturate(5) hue-rotate(220deg)', classes: [], sound: 'magic' },
};

// Weighted adjacency. Every state points at several others; the graph is
// strongly connected so a walk of any length keeps moving.
const TRANSITIONS: Record<string, [string, number][]> = {
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

const START_STATES = ['grow', 'rainbow', 'sparkle', 'float', 'red'];

function pick<T>(items: [T, number][], rng: () => number): T {
    const total = items.reduce((s, [, w]) => s + w, 0);
    let r = rng() * total;
    for (const [item, w] of items) {
        r -= w;
        if (r <= 0) return item;
    }
    return items[items.length - 1][0];
}

function nextFx(current: string, rng: () => number): string {
    return pick(TRANSITIONS[current] ?? [['rainbow', 1]], rng);
}

// Walk the chain `steps` times from a random start, avoiding immediate repeats.
// `rng` is an optional injectable random source (default Math.random) so walks
// can be made deterministic under a seeded generator. Additive & backward
// compatible. Note: like the original, a walk always contains at least one
// state, even for steps <= 0.
//
// The retry below is defensive only: today's TRANSITIONS table has no
// self-loops, so `n !== prev` always holds after one pick. It guards against
// future table edits introducing a self-transition.
export function walkFx(steps: number, rng: () => number = Math.random): string[] {
    const path: string[] = [START_STATES[Math.floor(rng() * START_STATES.length)]];
    while (path.length < steps) {
        const prev = path[path.length - 1];
        let n = nextFx(prev, rng);
        if (n === prev) n = nextFx(n, rng);
        path.push(n);
    }
    return path;
}
