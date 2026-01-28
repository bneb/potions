
"use client";

import React, { useState } from 'react';
import { AnimalCarousel, AnimalState } from './AnimalCarousel';
import { PotionShelf } from './PotionShelf';
import { TreatShelf } from './TreatShelf';
import { Sorcerer } from './Sorcerer';
import { AnimalId, PotionType, TreatType } from '@/lib/schemas';
import { ANIMALS } from '@/lib/data';
import { audioEngine } from '@/lib/audio/audioEngine';
import { cn } from '@/lib/utils';

export function Game() {
    const [selectedId, setSelectedId] = useState<AnimalId | null>(null);
    const [isCasting, setIsCasting] = useState(false);
    const [effects, setEffects] = useState<Partial<Record<AnimalId, {
        scale: number;
        filter: string;
        classes: string[];
        treats: TreatType[];
    }>>>({});

    const handleUsePotion = (type: PotionType) => {
        if (!selectedId) {
            audioEngine.playError();
            // Shake feedback logic here (via global UI state or transient class)
            return;
        }

        setIsCasting(true);
        setTimeout(() => setIsCasting(false), 500);

        // Audio calculation
        switch (type) {
            case 'growth': audioEngine.playGrowth(); break;
            case 'shrink': audioEngine.playShrink(); break;
            case 'red': case 'purple': audioEngine.playMagic(); break;
            case 'rainbow': audioEngine.playRainbow(); break;
            case 'sunshine': audioEngine.playSunshine(); break;
        }

        setEffects(prev => {
            const current = prev[selectedId] || { scale: 1, filter: '', classes: [], treats: [] };
            let next = { ...current };

            // Reset mutually exclusive transformations
            next.scale = 1;
            next.filter = '';
            next.classes = next.classes.filter(c => c !== 'animate-rainbow');

            switch (type) {
                case 'growth': next.scale = 1.3; break;
                case 'shrink': next.scale = 0.7; break;
                case 'red': next.filter = 'sepia(1) saturate(5) hue-rotate(-50deg)'; break;
                case 'purple': next.filter = 'sepia(1) saturate(5) hue-rotate(220deg)'; break;
                case 'rainbow': next.classes.push('animate-rainbow'); break;
                case 'sunshine': next.filter = 'sepia(1) saturate(10) hue-rotate(0deg) drop-shadow(0 0 15px gold)'; break;
            }

            return {
                ...prev,
                [selectedId]: next
            };
        });
    };

    const handleGiveTreat = (type: TreatType) => {
        if (!selectedId) {
            audioEngine.playError();
            return;
        }

        setIsCasting(true);
        setTimeout(() => setIsCasting(false), 500);

        const isDog = selectedId === 'husky';
        const finalType = (type === 'present' && isDog) ? 'bone' : type;

        if (finalType === 'hotdog') audioEngine.playHotdog();
        else audioEngine.playPresent();

        setEffects(prev => {
            const current = prev[selectedId] || { scale: 1, filter: '', classes: [], treats: [] };
            // Limit treats to prevent overflow? Nah, let them stack.
            return {
                ...prev,
                [selectedId]: {
                    ...current,
                    treats: [...current.treats, finalType]
                }
            };
        });
    };

    // Compute derived view state for carousel
    const animalStates: Partial<Record<AnimalId, AnimalState>> = {};

    // Default init
    ANIMALS.forEach(a => {
        const data = effects[a.id];
        if (!data) {
            animalStates[a.id] = { scale: 1, filter: '', classes: [], overlays: [] };
        } else {
            // Map treats to overlays
            const overlays = data.treats.map((t, i) => {
                // Position logic similar to legacy
                const isSunglasses = t === 'sunglasses';
                return (
                    <div
                        key={i}
                        className={cn(
                            "absolute pointer-events-none animate-pop z-20 text-4xl",
                            isSunglasses ? "top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2" : "bottom-0 left-1/2 -translate-x-1/2 translate-y-2"
                        )}
                        style={{
                            transitionDelay: `${i * 0.1}s`,
                            // Random jitter for pileup
                            marginLeft: isSunglasses ? 0 : `${(i % 3 - 1) * 10}px`
                        }}
                    >
                        {/* We can map type to emoji again or use data */}
                        {/* Simplified lookup */}
                        {t === 'hotdog' ? '🌭' :
                            t === 'present' ? '🎁' :
                                t === 'banana' ? '🍌' :
                                    t === 'pizza' ? '🍕' :
                                        t === 'icecream' ? '🍦' :
                                            t === 'bone' ? '🦴' :
                                                t === 'bouquet' ? '💐' :
                                                    t === 'sunglasses' ? '🕶️' : '🎁'}
                    </div>
                );
            });

            // Sunshine overlay
            const isSunshine = data.filter.includes('gold');
            if (isSunshine) {
                overlays.unshift(
                    <div key="sun" className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full animate-pulse z-0" />
                );
            }

            animalStates[a.id] = {
                scale: data.scale,
                filter: data.filter,
                classes: data.classes,
                overlays
            };
        }
    });

    return (
        <div className="w-full h-screen flex flex-col items-center justify-between p-4 relative overflow-hidden bg-gradient-to-b from-sky-300 to-green-200">
            <Sorcerer isCasting={isCasting} />

            <header className="mb-4 pt-8 z-10">
                <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] font-serif tracking-widest uppercase">
                    Magic Potions
                </h1>
            </header>

            <main className="w-full max-w-6xl flex-grow flex flex-col items-center justify-center relative z-10">
                <AnimalCarousel
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    animalStates={animalStates}
                />
            </main>

            <footer className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 z-10">
                <PotionShelf onUsePotion={handleUsePotion} disabled={!selectedId} />
                <TreatShelf onGiveTreat={handleGiveTreat} disabled={!selectedId} />
            </footer>

            {/* Ambient Particles Layer could go here */}
        </div>
    );
}
