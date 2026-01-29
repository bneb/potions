"use client";

import React, { useState } from 'react';
import { AnimalCarousel, AnimalState } from './AnimalCarousel';
import { PotionShelf } from './PotionShelf';
import { TreatShelf } from './TreatShelf';
import { AlchemistLaboratory } from './AlchemistLaboratory';
import { Sorcerer } from './Sorcerer';
import { InstructionalPrompt } from './InstructionalPrompt';
import { CelebrationOverlay } from './CelebrationOverlay';
import { IridescentBackground } from './IridescentBackground';
import { AnimalId, PotionType, TreatType, BrewedEffect } from '@/lib/schemas';
import { ANIMALS } from '@/lib/data';
import { audioEngine } from '@/lib/audio/audioEngine';
import { applyBrewedEffect, EFFECT_VISUALS } from '@/lib/potionLogic';
import { cn } from '@/lib/utils';

export function Game() {
    const [selectedIds, setSelectedIds] = useState<AnimalId[]>([]);
    const [isCasting, setIsCasting] = useState(false);
    const [celebrationTrigger, setCelebrationTrigger] = useState(0);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [useLabMode, setUseLabMode] = useState(true); // New alchemy mode by default
    const [overflowLevels, setOverflowLevels] = useState<Partial<Record<AnimalId, number>>>({});
    const [effects, setEffects] = useState<Partial<Record<AnimalId, {
        scale: number;
        filter: string;
        classes: string[];
        treats: TreatType[];
    }>>>({});

    const allAnimalIds = ANIMALS.map(a => a.id);
    const allSelected = selectedIds.length === allAnimalIds.length;
    const hasSelection = selectedIds.length > 0;

    const triggerCelebration = () => {
        setCelebrationTrigger(prev => prev + 1);
    };

    const handleUsePotion = (type: PotionType) => {
        if (selectedIds.length === 0) {
            audioEngine.playError();
            return;
        }

        setIsCasting(true);
        setTimeout(() => setIsCasting(false), 500);
        triggerCelebration();

        switch (type) {
            case 'growth': audioEngine.playGrowth(); break;
            case 'shrink': audioEngine.playShrink(); break;
            case 'red': case 'purple': audioEngine.playMagic(); break;
            case 'rainbow': audioEngine.playRainbow(); break;
            case 'sunshine': audioEngine.playSunshine(); break;
        }

        setEffects(prev => {
            const updated = { ...prev };
            selectedIds.forEach(id => {
                const current = updated[id] || { scale: 1, filter: '', classes: [], treats: [] };
                let next = { ...current };

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

                updated[id] = next;
            });
            return updated;
        });
    };

    const handleGiveTreat = (type: TreatType) => {
        if (selectedIds.length === 0) {
            audioEngine.playError();
            return;
        }

        setIsCasting(true);
        setTimeout(() => setIsCasting(false), 500);
        triggerCelebration();

        if (type === 'hotdog') audioEngine.playHotdog();
        else audioEngine.playPresent();

        setEffects(prev => {
            const updated = { ...prev };
            selectedIds.forEach(id => {
                const isDog = id === 'husky';
                const finalType = (type === 'present' && isDog) ? 'bone' : type;
                const current = updated[id] || { scale: 1, filter: '', classes: [], treats: [] };
                updated[id] = {
                    ...current,
                    treats: [...current.treats, finalType]
                };
            });
            return updated;
        });
    };

    const handleSelect = (id: AnimalId) => {
        setHasInteracted(true);
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const handleToggleSelectAll = () => {
        audioEngine.playPop();
        if (allSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds([...allAnimalIds]);
        }
    };

    const handleReset = () => {
        if (selectedIds.length === 0) {
            audioEngine.playError();
            return;
        }
        setEffects(prev => {
            const updated = { ...prev };
            selectedIds.forEach(id => {
                delete updated[id];
            });
            return updated;
        });
        audioEngine.playMagic();
        triggerCelebration();
    };

    // NEW: Handle brewed potion from AlchemistLaboratory
    const handleApplyBrewedEffect = (effect: BrewedEffect) => {
        if (selectedIds.length === 0) {
            audioEngine.playError();
            return;
        }

        setIsCasting(true);
        setTimeout(() => setIsCasting(false), 500);
        triggerCelebration();

        // Apply the brewed effect to all selected characters
        setEffects(prev => {
            const updated = { ...prev };
            selectedIds.forEach(id => {
                const current = updated[id] || { scale: 1, filter: '', classes: [], treats: [] };
                const effectState = applyBrewedEffect(effect);

                updated[id] = {
                    ...current,
                    scale: effectState.scale,
                    filter: effectState.filter,
                    classes: [...effectState.classes],
                };
            });
            return updated;
        });

        // Update overflow levels
        setOverflowLevels(prev => {
            const updated = { ...prev };
            selectedIds.forEach(id => {
                const effectState = applyBrewedEffect(effect);
                updated[id] = effectState.overflowLevel;
            });
            return updated;
        });
    };

    // Compute derived view state for carousel
    const animalStates: Partial<Record<AnimalId, AnimalState>> = {};

    ANIMALS.forEach(a => {
        const data = effects[a.id];
        if (!data) {
            animalStates[a.id] = { scale: 1, filter: '', classes: [], overlays: [] };
        } else {
            const overlays = data.treats.map((t, i) => {
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
                            marginLeft: isSunglasses ? 0 : `${(i % 3 - 1) * 10}px`
                        }}
                    >
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
        <div className="w-full h-screen flex flex-col items-center justify-between p-2 relative overflow-y-auto"
            style={{ background: 'var(--bg-magical-sky)' }}>

            {/* Iridescent Background */}
            <IridescentBackground />

            {/* Celebration Overlay */}
            <CelebrationOverlay trigger={celebrationTrigger} />

            {/* Instructional Prompt */}
            <InstructionalPrompt
                show={!hasInteracted && !hasSelection}
                onDismiss={() => setHasInteracted(true)}
            />

            <Sorcerer isCasting={isCasting} />

            {/* Header - Friendly Title */}
            <header className="mb-1 pt-2 z-10 flex-shrink-0">
                <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] tracking-wide text-center">
                    ✨ Magic Potions ✨
                </h1>

                {/* Control Buttons */}
                <div className="flex justify-center gap-3 mt-1">
                    {/* Mode Toggle */}
                    <button
                        onClick={() => setUseLabMode(!useLabMode)}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-semibold transition-all",
                            "bg-white/10 backdrop-blur-sm border border-white/20",
                            "hover:bg-white/20 hover:scale-105 active:scale-95",
                            useLabMode && "bg-purple-500/30 border-purple-400/50"
                        )}
                    >
                        <span className="text-white/90">
                            {useLabMode ? '🧪 Lab Mode' : '✨ Classic'}
                        </span>
                    </button>
                    <button
                        onClick={handleToggleSelectAll}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-semibold transition-all",
                            "bg-white/10 backdrop-blur-sm border border-white/20",
                            "hover:bg-white/20 hover:scale-105 active:scale-95"
                        )}
                    >
                        <span className="text-white/90">
                            {allSelected ? '🚫 Deselect All' : '✅ Select All'}
                        </span>
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={!hasSelection}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-semibold transition-all",
                            "bg-white/10 backdrop-blur-sm border border-white/20",
                            "hover:bg-white/20 hover:scale-105 active:scale-95",
                            !hasSelection && "opacity-40 cursor-not-allowed"
                        )}
                    >
                        <span className="text-white/90">🔄 Reset</span>
                    </button>
                </div>

                {/* Selection Hint */}
                {!hasSelection && hasInteracted && (
                    <p className="text-center text-white/80 text-lg mt-2 animate-float">
                        Choose a friend below! 👇
                    </p>
                )}

                {hasSelection && (
                    <p className="text-center text-yellow-300 text-xl mt-2 font-semibold">
                        {selectedIds.length === 1
                            ? `${ANIMALS.find(a => a.id === selectedIds[0])?.name} is ready! 🌟`
                            : `${selectedIds.length} friends are ready! 🌟`
                        }
                    </p>
                )}
            </header>

            {/* Main Stage - Animals */}
            <main className="w-full max-w-6xl flex-grow flex flex-col items-center justify-center relative z-10">
                <AnimalCarousel
                    selectedIds={selectedIds}
                    onSelect={handleSelect}
                    animalStates={animalStates}
                />
            </main>

            {/* Footer - Action Shelves */}
            <footer className="w-full mb-2 z-10 px-2 flex justify-center flex-shrink-0">
                {useLabMode ? (
                    /* NEW: Alchemy Laboratory Mode */
                    <AlchemistLaboratory
                        onApplyEffect={handleApplyBrewedEffect}
                        disabled={!hasSelection}
                    />
                ) : (
                    /* Classic Mode: Original shelves */
                    <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                        <PotionShelf
                            onUsePotion={handleUsePotion}
                            disabled={!hasSelection}
                            isReady={hasSelection}
                        />
                        <TreatShelf
                            onGiveTreat={handleGiveTreat}
                            disabled={!hasSelection}
                            isReady={hasSelection}
                        />
                    </div>
                )}
            </footer>
        </div >
    );
}
