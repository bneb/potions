"use client";

import React from 'react';
import Image from 'next/image';
import { POTIONS } from '@/lib/data';
import { PotionType } from '@/lib/schemas';
import { cn } from '@/lib/utils';

interface PotionShelfProps {
    onUsePotion: (type: PotionType) => void;
    disabled?: boolean;
    isReady?: boolean;
}

export function PotionShelf({ onUsePotion, disabled, isReady }: PotionShelfProps) {
    return (
        <div className={cn(
            "glass-shelf p-6 transition-all duration-300",
            isReady && "ready-glow"
        )}>
            <h3 className="text-white text-center font-bold text-xl mb-4 label-friendly flex items-center justify-center gap-2">
                <span>✨</span>
                <span>Magic Potions</span>
                <span>✨</span>
            </h3>
            <div className="flex gap-4 justify-center flex-wrap">
                {POTIONS.map((potion) => (
                    <button
                        key={potion.id}
                        disabled={disabled}
                        onClick={() => onUsePotion(potion.id)}
                        className={cn(
                            "touch-target-lg btn-magic relative group",
                            "bg-white/10 rounded-2xl p-2",
                            disabled && "opacity-40 cursor-not-allowed grayscale"
                        )}
                        title={potion.name}
                        aria-label={potion.name}
                    >
                        {/* Hover Glow */}
                        <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Potion Image */}
                        <Image
                            src={potion.imageSrc}
                            alt={potion.name}
                            width={56}
                            height={56}
                            className="drop-shadow-lg object-contain relative z-10"
                        />

                        {/* Label */}
                        <p className="text-xs text-white/80 mt-1 text-center font-medium">
                            {potion.name.split(' ')[0]}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
}
