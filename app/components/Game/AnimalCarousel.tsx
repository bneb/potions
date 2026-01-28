
"use client";

import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ANIMALS } from '@/lib/data';
import { AnimalId } from '@/lib/schemas';
import { audioEngine } from '@/lib/audio/audioEngine';
import { Orangutan } from './Orangutan';
import { Trex } from './Trex';
import { Santa } from './Santa';
import { Crocodile } from './Crocodile';
import { Husky } from './Husky';
import { Scorpion } from './Scorpion';


export interface AnimalState {
    scale: number;
    filter: string;
    classes: string[];
    overlays: React.ReactNode[];
}

interface AnimalCarouselProps {
    selectedId: AnimalId | null;
    onSelect: (id: AnimalId) => void;
    animalStates: Partial<Record<AnimalId, AnimalState>>;
    className?: string;
}

export function AnimalCarousel({ selectedId, onSelect, animalStates, className }: AnimalCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    // We explicitly create 3 sets for the infinite loop illusion
    const items = [...ANIMALS, ...ANIMALS, ...ANIMALS];
    // Calculate the index offset for the middle set
    const middleSetStart = ANIMALS.length;

    useEffect(() => {
        // Initial centering
        if (scrollRef.current) {
            const container = scrollRef.current;
            // Approximation: wait for layout or use a ResizeObserver in a real app
            // Here we just set it after a tick
            setTimeout(() => {
                const itemWidth = container.scrollWidth / 3;
                container.scrollLeft = itemWidth;
            }, 100);
        }
    }, []);

    const handleScroll = () => {
        const container = scrollRef.current;
        if (!container) return;

        const scrollLeft = container.scrollLeft;
        const scrollWidth = container.scrollWidth;
        const oneSetWidth = scrollWidth / 3;

        // If we scroll past the end of the second set (into the third), snap back to second
        if (scrollLeft >= oneSetWidth * 2) {
            container.scrollLeft = scrollLeft - oneSetWidth;
        }
        // If we scroll into the first set, snap forward to second
        else if (scrollLeft <= 5) { // Tolerance
            container.scrollLeft = scrollLeft + oneSetWidth;
        }
    };

    return (
        <div
            className={cn("relative w-full h-[300px] flex items-center overflow-hidden", className)}
        >
            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto no-scrollbar w-full h-full items-center px-[50vw] snap-x snap-mandatory"
                style={{ scrollBehavior: 'auto' }} // Smooth scrolling controlled by user, auto for snap reset
                onScroll={handleScroll}
            >
                {items.map((animal, index) => {
                    // Unique key strategy: id + batch index
                    const uniqueKey = `${animal.id}-${index}`;
                    const isSelected = selectedId === animal.id;

                    const state = animalStates[animal.id] || { scale: 1, filter: '', classes: [], overlays: [] };
                    // Use the state from the parent for transforms.
                    // We need to merge the state.scale with the hover/select scale?
                    // Simplest: The container scales for selection, the IMAGE scales for effects.

                    return (
                        <div
                            key={uniqueKey}
                            onClick={() => {
                                audioEngine.playPop();
                                onSelect(animal.id);
                            }}
                            className={cn(
                                "flex-shrink-0 w-48 h-48 relative cursor-pointer transition-all duration-300 snap-center flex items-center justify-center group/animal",
                                isSelected ? "scale-105 z-10" : "scale-90 opacity-80 hover:opacity-100"
                            )}
                        >
                            {/* Selection Ring */}
                            <div className={cn(
                                "absolute inset-0 rounded-full border-4 transition-colors z-20 pointer-events-none",
                                isSelected ? "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]" : "border-transparent"
                            )} />

                            <div className="relative w-40 h-40 animal-wrapper flex items-center justify-center">

                                {/* Overlays (Behind) */}
                                {state.overlays.map((ov, i) => <React.Fragment key={i}>{ov}</React.Fragment>)}

                                <div
                                    style={{
                                        transform: `scale(${state.scale})`,
                                        filter: state.filter
                                    }}
                                    className={cn("transition-all duration-500 will-change-transform relative", state.classes)}
                                >
                                    {animal.id === 'orangutan' ? (
                                        <div className="w-[160px] h-[160px] flex items-center justify-center">
                                            <Orangutan className="scale-75 origin-center" />
                                        </div>
                                    ) : animal.id === 'trex' ? (
                                        <div className="w-[160px] h-[160px] flex items-center justify-center">
                                            <Trex className="origin-center" selected={isSelected} />
                                        </div>
                                    ) : animal.id === 'santa' ? (
                                        <div className="w-[160px] h-[160px] flex items-center justify-center">
                                            <Santa className="origin-center" selected={isSelected} />
                                        </div>
                                    ) : animal.id === 'crocodile' ? (
                                        <div className="w-[160px] h-[160px] flex items-center justify-center">
                                            <Crocodile className="origin-center" selected={isSelected} />
                                        </div>
                                    ) : animal.id === 'husky' ? (
                                        <div className="w-[160px] h-[160px] flex items-center justify-center">
                                            <Husky className="origin-center" selected={isSelected} />
                                        </div>
                                    ) : animal.id === 'scorpion' ? (
                                        <div className="w-[160px] h-[160px] flex items-center justify-center">
                                            <Scorpion className="origin-center" selected={isSelected} />
                                        </div>
                                    ) : (
                                        <Image
                                            src={animal.imageSrc}
                                            alt={animal.name}
                                            width={160}
                                            height={160}
                                            className="object-contain drop-shadow-lg"
                                            priority={index >= middleSetStart && index < middleSetStart + 5}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
