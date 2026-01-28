
"use client";

import React from 'react';
import Image from 'next/image';
import { POTIONS } from '@/lib/data';

import { PotionType } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { audioEngine } from '@/lib/audio/audioEngine';

interface PotionShelfProps {
    onUsePotion: (type: PotionType) => void;
    disabled?: boolean;
}

export function PotionShelf({ onUsePotion, disabled }: PotionShelfProps) {
    return (
        <div className="bg-amber-900/40 p-6 rounded-xl backdrop-blur-sm border border-amber-800/50 shadow-2xl">
            <h3 className="text-amber-100 text-center font-bold text-xl mb-4 font-serif uppercase tracking-wider drop-shadow-md">Potions</h3>
            <div className="flex gap-4 justify-center flex-wrap">
                {POTIONS.map((potion) => (
                    <button
                        key={potion.id}
                        disabled={disabled}
                        onClick={() => {
                            // Audio is handled in logic or here? 
                            // Legacy had logic specific sounds. logic handles it mostly, but shelf click might have immediate feedback?
                            // Logic handles it (audioEngine.playGrowth etc).
                            onUsePotion(potion.id);
                        }}
                        className={cn(
                            "group relative w-16 h-16 transition-all hover:scale-110 active:scale-95",
                            disabled && "opacity-50 cursor-not-allowed grayscale"
                        )}
                        title={potion.name}
                    >
                        <div className="absolute inset-0 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Image
                            src={potion.imageSrc}
                            alt={potion.name}
                            width={64}
                            height={64}
                            className="drop-shadow-lg object-contain"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}
