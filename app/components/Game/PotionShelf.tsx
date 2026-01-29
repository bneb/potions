"use client";

import React from 'react';
import { POTIONS } from '@/lib/data';
import { PotionType } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { Potion } from './Potion';

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
            <div className="flex gap-5 justify-center flex-wrap">
                {POTIONS.map((potion) => (
                    <div
                        key={potion.id}
                        className="flex flex-col items-center gap-2"
                    >
                        <Potion
                            type={potion.id}
                            disabled={disabled}
                            isReady={isReady}
                            onClick={() => onUsePotion(potion.id)}
                            size="md"
                            showLabel={false}
                        />
                        {/* Label below potion */}
                        <p className="text-xs text-white/80 text-center font-medium">
                            {potion.name.split(' ')[0]}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

