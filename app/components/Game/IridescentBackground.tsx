"use client";

import React from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export function IridescentBackground() {
    const reducedMotion = usePrefersReducedMotion();

    return (
        <div className="absolute inset-0 z-0 overflow-hidden">
            {/* Base gradient - synthwave sunset (static, always rendered) */}
            <div
                className="absolute inset-0"
                style={{
                    background: `linear-gradient(
                        180deg, 
                        #1a0a2e 0%,
                        #2d1b4e 15%,
                        #4a2c6b 30%,
                        #6b3a7d 45%,
                        #8b4a8a 60%,
                        #b06b9a 75%,
                        #d4a5c0 90%,
                        #f0d9e8 100%
                    )`,
                }}
            />

            {/* Everything below loops forever — skipped entirely when the user
                prefers reduced motion. */}
            {!reducedMotion && (
                <>
                    {/* Soft wave layer 1 - deep purple */}
                    <div
                        data-testid="ambient-animated-layer"
                        className="absolute inset-0"
                        style={{
                            background: `radial-gradient(
                                ellipse 200% 100% at 30% 100%, 
                                rgba(75, 0, 130, 0.5) 0%, 
                                transparent 60%
                            )`,
                            filter: 'blur(60px)',
                            animation: 'softWave1 25s ease-in-out infinite',
                        }}
                    />

                    {/* Soft wave layer 2 - magenta glow */}
                    <div
                        data-testid="ambient-animated-layer"
                        className="absolute inset-0"
                        style={{
                            background: `radial-gradient(
                                ellipse 180% 120% at 70% 80%, 
                                rgba(255, 20, 147, 0.3) 0%, 
                                transparent 50%
                            )`,
                            filter: 'blur(80px)',
                            animation: 'softWave2 30s ease-in-out infinite',
                        }}
                    />

                    {/* Soft wave layer 3 - cyan accent */}
                    <div
                        data-testid="ambient-animated-layer"
                        className="absolute inset-0"
                        style={{
                            background: `radial-gradient(
                                ellipse 150% 80% at 20% 30%, 
                                rgba(0, 255, 255, 0.2) 0%, 
                                transparent 45%
                            )`,
                            filter: 'blur(100px)',
                            animation: 'softWave3 20s ease-in-out infinite',
                        }}
                    />

                    {/* Warm glow layer - sunset orange */}
                    <div
                        data-testid="ambient-animated-layer"
                        className="absolute inset-0"
                        style={{
                            background: `radial-gradient(
                                ellipse 120% 100% at 80% 60%, 
                                rgba(255, 100, 50, 0.15) 0%, 
                                transparent 40%
                            )`,
                            filter: 'blur(70px)',
                            animation: 'softWave4 22s ease-in-out infinite',
                        }}
                    />

                    {/* Subtle floating orbs - dreamy particles */}
                    {Array.from({ length: 8 }, (_, i) => (
                        <div
                            key={i}
                            data-testid="ambient-animated-layer"
                            className="absolute rounded-full"
                            style={{
                                width: `${60 + (i * 20)}px`,
                                height: `${60 + (i * 20)}px`,
                                left: `${(i * 13) % 90}%`,
                                top: `${(i * 17) % 80}%`,
                                background: `radial-gradient(circle, 
                                    ${i % 2 === 0 ? 'rgba(255, 100, 200, 0.15)' : 'rgba(100, 200, 255, 0.12)'} 0%, 
                                    transparent 70%
                                )`,
                                filter: 'blur(30px)',
                                animation: `floatOrb ${15 + i * 3}s ease-in-out infinite`,
                                animationDelay: `${i * 2}s`,
                            }}
                        />
                    ))}

                    {/* Occasional shimmer - very soft, organic */}
                    <div
                        data-testid="ambient-animated-layer"
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: `radial-gradient(
                                ellipse 100% 50% at 50% 50%,
                                rgba(255, 255, 255, 0.03) 0%,
                                transparent 70%
                            )`,
                            filter: 'blur(40px)',
                            animation: 'gentleShimmer 15s ease-in-out infinite',
                        }}
                    />
                </>
            )}
        </div>
    );
}
