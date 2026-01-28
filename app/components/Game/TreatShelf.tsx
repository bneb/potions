
"use client";

import React from 'react';
import { TREATS } from '@/lib/data';
import { TreatType } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { audioEngine } from '@/lib/audio/audioEngine';

interface TreatShelfProps {
    onGiveTreat: (type: TreatType) => void;
    disabled?: boolean;
}

export function TreatShelf({ onGiveTreat, disabled }: TreatShelfProps) {
    return (
        <div className="bg-amber-900/40 p-6 rounded-xl backdrop-blur-sm border border-amber-800/50 shadow-2xl">
            <h3 className="text-amber-100 text-center font-bold text-xl mb-4 font-serif uppercase tracking-wider drop-shadow-md">Treats</h3>
            <div className="flex gap-4 justify-center flex-wrap">
                {TREATS.map((treat) => (
                    <button
                        key={treat.id}
                        disabled={disabled}
                        onClick={() => {
                            onGiveTreat(treat.id);
                        }}
                        className={cn(
                            "w-16 h-16 flex items-center justify-center text-4xl bg-white/10 rounded-full transition-all hover:scale-110 hover:bg-white/20 active:scale-95 shadow-inner border border-white/10",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                        title={treat.name}
                    >
                        {treat.emoji}
                    </button>
                ))}
            </div>
        </div>
    );
}
