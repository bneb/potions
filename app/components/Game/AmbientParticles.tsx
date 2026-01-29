"use client";

import React from 'react';

const PARTICLE_COLORS = [
    'rgba(241, 196, 15, 0.6)',  // Yellow
    'rgba(155, 89, 182, 0.5)', // Purple
    'rgba(52, 152, 219, 0.5)', // Blue
    'rgba(46, 204, 113, 0.4)', // Green
    'rgba(255, 159, 243, 0.5)', // Pink
];

export function AmbientParticles() {
    // Generate static particles for SSR compatibility
    const particles = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        size: 6 + (i % 5) * 2,
        left: (i * 7) % 100,
        delay: (i * 0.5) % 8,
        duration: 6 + (i % 4) * 2,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length]
    }));

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="particle"
                    style={{
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        left: `${p.left}%`,
                        bottom: '-20px',
                        background: `radial-gradient(circle, ${p.color}, transparent)`,
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                    }}
                />
            ))}

            {/* Twinkling stars */}
            {Array.from({ length: 8 }, (_, i) => (
                <div
                    key={`star-${i}`}
                    className="particle-sparkle"
                    style={{
                        left: `${10 + (i * 12) % 80}%`,
                        top: `${5 + (i * 7) % 30}%`,
                        animationDelay: `${i * 0.3}s`,
                    }}
                />
            ))}
        </div>
    );
}
