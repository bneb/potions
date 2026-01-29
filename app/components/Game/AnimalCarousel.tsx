"use client";

import React, { useRef, useEffect } from 'react';
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
    selectedIds: AnimalId[];
    onSelect: (id: AnimalId) => void;
    animalStates: Partial<Record<AnimalId, AnimalState>>;
    className?: string;
}

export function AnimalCarousel({ selectedIds, onSelect, animalStates, className }: AnimalCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const items = [...ANIMALS, ...ANIMALS, ...ANIMALS];
    const middleSetStart = ANIMALS.length;

    useEffect(() => {
        if (scrollRef.current) {
            const container = scrollRef.current;
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

        if (scrollLeft >= oneSetWidth * 2) {
            container.scrollLeft = scrollLeft - oneSetWidth;
        } else if (scrollLeft <= 5) {
            container.scrollLeft = scrollLeft + oneSetWidth;
        }
    };

    const renderAnimalComponent = (animalId: AnimalId, isSelected: boolean) => {
        const componentMap: Record<string, React.ReactNode> = {
            'orangutan': <Orangutan className="scale-75 origin-center" />,
            'trex': <Trex className="origin-center" selected={isSelected} />,
            'santa': <Santa className="origin-center" selected={isSelected} />,
            'crocodile': <Crocodile className="origin-center" selected={isSelected} />,
            'husky': <Husky className="origin-center" selected={isSelected} />,
            'scorpion': <Scorpion className="origin-center" selected={isSelected} />,
        };
        return componentMap[animalId] || null;
    };

    return (
        <div
            className={cn("relative w-full h-[340px] flex items-center overflow-hidden", className)}
            style={{
                maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
            }}
        >
            <div
                ref={scrollRef}
                className="flex gap-6 overflow-x-auto no-scrollbar w-full h-full items-center px-[50vw] snap-x snap-mandatory"
                style={{ scrollBehavior: 'auto' }}
                onScroll={handleScroll}
            >
                {items.map((animal, index) => {
                    const uniqueKey = `${animal.id}-${index}`;
                    const isSelected = selectedIds.includes(animal.id);
                    const state = animalStates[animal.id] || { scale: 1, filter: '', classes: [], overlays: [] };

                    return (
                        <div
                            key={uniqueKey}
                            onClick={() => {
                                audioEngine.playPop();
                                onSelect(animal.id);
                            }}
                            className={cn(
                                "flex-shrink-0 w-56 h-56 relative cursor-pointer transition-all duration-300 snap-center",
                                "flex flex-col items-center justify-center group/animal touch-target",
                                isSelected ? "scale-105 z-10" : "scale-90 opacity-80 hover:opacity-100 hover:scale-95"
                            )}
                        >
                            {/* Selection Spotlight */}
                            {isSelected && (
                                <div className="absolute inset-0 spotlight rounded-3xl animate-pulse" />
                            )}

                            {/* Selection Ring */}
                            <div className={cn(
                                "absolute inset-0 rounded-3xl border-4 transition-all z-20 pointer-events-none",
                                isSelected
                                    ? "border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.7)]"
                                    : "border-transparent group-hover/animal:border-white/30"
                            )} />

                            {/* Animal Container */}
                            <div className="relative w-44 h-44 animal-wrapper flex items-center justify-center">
                                {/* Overlays */}
                                {state.overlays.map((ov, i) => <React.Fragment key={i}>{ov}</React.Fragment>)}

                                <div
                                    style={{
                                        transform: `scale(${state.scale})`,
                                        filter: state.filter
                                    }}
                                    className={cn(
                                        "transition-all duration-500 will-change-transform relative",
                                        state.classes,
                                        isSelected && "animate-bounce-playful"
                                    )}
                                >
                                    {renderAnimalComponent(animal.id, isSelected) || (
                                        <Image
                                            src={animal.imageSrc}
                                            alt={animal.name}
                                            width={176}
                                            height={176}
                                            className="object-contain drop-shadow-lg"
                                            priority={index >= middleSetStart && index < middleSetStart + 5}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Animal Name Label */}
                            <p className={cn(
                                "mt-2 text-lg font-semibold transition-all",
                                isSelected
                                    ? "text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                                    : "text-white/70"
                            )}>
                                {animal.name}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
