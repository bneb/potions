"use client";

import React, { useEffect, useState } from 'react';

interface CelebrationOverlayProps {
    trigger: number; // Increment to trigger celebration
}

const COLORS = ['#f1c40f', '#e74c3c', '#9b59b6', '#3498db', '#27ae60', '#ff9ff3'];

export function CelebrationOverlay({ trigger }: CelebrationOverlayProps) {
    const [particles, setParticles] = useState<Array<{ id: number; x: number; color: string; delay: number }>>([]);

    useEffect(() => {
        if (trigger > 0) {
            // Generate confetti particles
            const newParticles = Array.from({ length: 20 }, (_, i) => ({
                id: Date.now() + i,
                x: Math.random() * 100,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                delay: Math.random() * 0.3
            }));
            setParticles(newParticles);

            // Clear after animation
            const timer = setTimeout(() => setParticles([]), 1500);
            return () => clearTimeout(timer);
        }
    }, [trigger]);

    if (particles.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="confetti-piece rounded-full"
                    style={{
                        left: `${p.x}%`,
                        top: '50%',
                        backgroundColor: p.color,
                        animationDelay: `${p.delay}s`,
                        width: `${10 + Math.random() * 10}px`,
                        height: `${10 + Math.random() * 10}px`,
                        filter: 'blur(2px)',
                        boxShadow: `0 0 10px ${p.color}`,
                    }}
                />
            ))}

            {/* Central burst */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="text-6xl animate-pop">✨</div>
            </div>
        </div>
    );
}
