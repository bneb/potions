"use client";

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

interface InstructionalPromptProps {
    show: boolean;
    onDismiss?: () => void;
}

export function InstructionalPrompt({ show, onDismiss }: InstructionalPromptProps) {
    const reducedMotion = usePrefersReducedMotion();
    // The prompt appears after a short beat so the magic scene lands first.
    const [delayElapsed, setDelayElapsed] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!show) return undefined;
        const timer = setTimeout(() => setDelayElapsed(true), 2000);
        return () => clearTimeout(timer);
    }, [show]);

    // Visibility is derived — when `show` goes false the overlay disappears
    // immediately with no cascading state updates.
    if (!show || dismissed || !delayElapsed) return null;

    return (
        <div
            data-testid="instructional-overlay"
            className={cn(
                "absolute inset-0 z-40 flex flex-col items-center justify-center",
                !reducedMotion && "animate-in fade-in duration-500"
            )}
            style={{
                // Tint-only scrim (no backdrop blur — perf-audit #7): the
                // gradient alone reads as "gentle pause" and keeps the kid's
                // first tap cheap to paint.
                background: 'radial-gradient(ellipse at center, rgba(26, 10, 46, 0.75) 0%, rgba(26, 10, 46, 0.5) 60%, rgba(26, 10, 46, 0.25) 100%)',
                // Pass taps through to the game — a kid aiming at a friend
                // should never lose their tap to the hint itself.
                pointerEvents: 'none',
            }}
        >
            <div
                data-testid="instructional-card"
                className={cn("flex flex-col items-center gap-4 cursor-pointer", !reducedMotion && "animate-float")}
                style={{ pointerEvents: 'auto' }}
                onClick={() => {
                    setDismissed(true);
                    onDismiss?.();
                }}
            >
                {/* Friendly Hand Pointing */}
                <div className={cn("text-8xl", !reducedMotion && "instructional-hand")}>
                    👆
                </div>

                {/* Instruction Text */}
                <div className="bg-white/90 px-8 py-4 rounded-full shadow-lg">
                    <p className="text-2xl font-semibold text-purple-700 text-center">
                        Tap a friend to choose them! 🐾
                    </p>
                </div>

                {/* Dismiss hint */}
                <p className="text-white/80 text-sm mt-4">
                    Tap anywhere to start playing
                </p>
            </div>
        </div>
    );
}
