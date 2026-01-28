
"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface SorcererProps {
    isCasting: boolean;
}

export function Sorcerer({ isCasting }: SorcererProps) {
    return (
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
            <div className={cn(
                "relative w-[150px] h-[150px] transition-transform duration-300",
                isCasting ? "scale-110 rotate-3" : "scale-100 animate-float"
            )}>
                <Image
                    src="/assets/sorcerer.png"
                    alt="Sorcerer"
                    width={150}
                    height={150}
                    className="drop-shadow-2xl"
                    priority
                />
                {/* Wand Sparkle */}
                {isCasting && (
                    <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-300 rounded-full blur-sm animate-ping" />
                )}
            </div>
        </div>
    );
}
