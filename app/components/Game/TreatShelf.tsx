"use client";

import React from 'react';
import { TREATS } from '@/lib/data';
import { TreatType } from '@/lib/schemas';
import { cn } from '@/lib/utils';

interface TreatShelfProps {
    onGiveTreat: (type: TreatType) => void;
    disabled?: boolean;
    isReady?: boolean;
}

export function TreatShelf({ onGiveTreat, disabled, isReady }: TreatShelfProps) {
    return (
        <div className={cn(
            "glass-shelf p-6 transition-all duration-300",
            isReady && "ready-glow"
        )}>
            <h3 className="text-white text-center font-bold text-xl mb-4 label-friendly flex items-center justify-center gap-2">
                <span>💕</span>
                <span>Yummy Treats</span>
                <span>💕</span>
            </h3>
            <div className="flex gap-4 justify-center flex-wrap">
                {TREATS.map((treat) => (
                    <button
                        key={treat.id}
                        disabled={disabled}
                        onClick={() => onGiveTreat(treat.id)}
                        className={cn(
                            "touch-target-lg btn-magic relative group",
                            "flex items-center justify-center",
                            "text-5xl bg-white/15 rounded-2xl",
                            "shadow-inner border border-white/20",
                            disabled && "opacity-40 cursor-not-allowed"
                        )}
                        title={treat.name}
                        aria-label={treat.name}
                    >
                        {/* Hover Effect */}
                        <div className="absolute inset-0 bg-white/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Emoji */}
                        <span className="relative z-10 drop-shadow-md">
                            {treat.emoji}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
