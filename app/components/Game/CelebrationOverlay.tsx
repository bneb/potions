"use client";

import React, { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export interface CelebrationBurst {
    /** Monotonically increasing counter — increment to fire a celebration. */
    epoch: number;
    /** Relative burst size: ~0.5 small treat, 1 normal potion, up to 2 huge. */
    magnitude?: number;
}

interface CelebrationOverlayProps {
    burst: CelebrationBurst;
}

interface Particle {
    id: number;
    emoji: string;
    x: number;        // horizontal position, vw %
    color: string;
    delay: number;    // animation delay, seconds
    duration: number; // animation duration, seconds
    size: number;     // font size, px
}

interface Batch {
    id: number;
    particles: Particle[];
}

const EMOJIS = ['⭐', '❤️', '✨', '🌟', '💫', '🎉'];
const COLORS = ['#f1c40f', '#e74c3c', '#9b59b6', '#3498db', '#27ae60', '#ff9ff3'];

/** Hard cap on confetti nodes actually mounted in the DOM. */
const MAX_LIVE_PARTICLES = 80;
/** Particles per regular celebration before scaling by magnitude. */
const BASE_COUNT = 24;
/** Particles per celebration when the user prefers reduced motion. */
const REDUCED_COUNT = 8;
/** How long a burst lives before its cleanup timer removes it. */
const LIFETIME_MS = 1600;
/** Batches kept in state; older ones are invisible (DOM shows newest only). */
const MAX_BATCHES = 4;

function makeParticle(id: number, reducedMotion: boolean): Particle {
    return {
        id,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        x: 4 + Math.random() * 92,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.25,
        duration: reducedMotion ? 0.4 : 1.1 + Math.random() * 0.5,
        size: reducedMotion ? 18 : 18 + Math.random() * 22,
    };
}

export function CelebrationOverlay({ burst }: CelebrationOverlayProps) {
    const reducedMotion = usePrefersReducedMotion();
    const [batches, setBatches] = useState<Batch[]>([]);
    const nextIdRef = useRef(0);
    const batchIdRef = useRef(0);
    const lastEpochRef = useRef(0);
    const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

    // Every celebration epoch spawns one bounded batch with its own removal
    // timer. Unmount clears every pending timer, so nothing ever leaks. The
    // epoch guard stops the effect from re-running (and conjuring a phantom
    // burst) when only `reducedMotion` flips mid-session.
    useEffect(() => {
        if (!burst.epoch || burst.epoch === lastEpochRef.current) return;
        lastEpochRef.current = burst.epoch;

        const magnitude = Math.min(2, Math.max(0.25, burst.magnitude ?? 1));
        const count = Math.round((reducedMotion ? REDUCED_COUNT : BASE_COUNT) * magnitude);
        const particles = Array.from({ length: count }, () =>
            makeParticle(nextIdRef.current++, reducedMotion),
        );
        const batchId = ++batchIdRef.current;

        setBatches(prev => [...prev, { id: batchId, particles }].slice(-MAX_BATCHES));

        const timer = setTimeout(() => {
            timersRef.current.delete(timer);
            setBatches(prev => prev.filter(b => b.id !== batchId));
        }, LIFETIME_MS);
        timersRef.current.add(timer);
    }, [burst.epoch, burst.magnitude, reducedMotion]);

    // Unmount cleanup: kill all pending timers.
    useEffect(() => () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current.clear();
    }, []);

    // The DOM never holds more than MAX_LIVE_PARTICLES particles: when many
    // celebrations overlap, only the newest ones stay visible.
    const liveParticles = batches
        .flatMap(b => b.particles)
        .slice(-MAX_LIVE_PARTICLES);

    if (liveParticles.length === 0) return null;

    return (
        <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {liveParticles.map((p) => (
                <span
                    key={p.id}
                    data-testid="celebration-particle"
                    className="celebration-particle"
                    style={{
                        left: `${p.x}%`,
                        top: '55%',
                        color: p.color,
                        fontSize: `${p.size}px`,
                        textShadow: `0 0 10px ${p.color}`,
                        animationDelay: `${p.delay}s`,
                        animationDuration: reducedMotion ? '0.4s' : `${p.duration}s`,
                    }}
                >
                    {p.emoji}
                </span>
            ))}

            {/* Big friendly flash in the middle */}
            <div
                key={burst.epoch}
                className={
                    reducedMotion
                        ? "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-90"
                        : "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pop"
                }
            >
                <div className={reducedMotion ? "text-5xl" : "text-6xl md:text-7xl yay-flash"}>
                    ✨ Yay! ✨
                </div>
            </div>
        </div>
    );
}

export default CelebrationOverlay;
