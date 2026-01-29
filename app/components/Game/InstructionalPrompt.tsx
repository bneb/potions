"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface InstructionalPromptProps {
    show: boolean;
    onDismiss?: () => void;
}

export function InstructionalPrompt({ show, onDismiss }: InstructionalPromptProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => setVisible(true), 2000);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [show]);

    if (!visible) return null;

    return (
        <div
            className={cn(
                "absolute inset-0 z-40 flex flex-col items-center justify-center",
                "animate-in fade-in duration-500"
            )}
            style={{
                background: 'radial-gradient(ellipse at center, rgba(26, 10, 46, 0.7) 0%, rgba(26, 10, 46, 0.4) 60%, transparent 100%)',
                backdropFilter: 'blur(8px)',
            }}
            onClick={() => {
                setVisible(false);
                onDismiss?.();
            }}
        >
            <div className="flex flex-col items-center gap-4 animate-float">
                {/* Friendly Hand Pointing */}
                <div className="text-8xl instructional-hand">
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
