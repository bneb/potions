"use client";

import React, { useEffect, useRef, useState } from 'react';
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
import { applyBrewedEffect } from '@/lib/potionLogic';
import { walkFx, FX_VISUALS } from '@/lib/markov';
import { cn } from '@/lib/utils';

const ALL_ANIMAL_IDS: AnimalId[] = ANIMALS.map(a => a.id);
const MUTED_STORAGE_KEY = 'potions-muted';
/** Emoji overlays per animal — enough for a pile, small enough to stay fast. */
const MAX_TREATS_PER_ANIMAL = 6;

interface AnimalEffectState {
    scale: number;
    filter: string;
    classes: string[];
    treats: TreatType[];
}

/** One-shot select/deselect animation info, fanned out to animal cards. */
interface SelectionPulse {
    epoch: number;
    added: readonly AnimalId[];
    removed: readonly AnimalId[];
}
const NO_PULSE: SelectionPulse = { epoch: 0, added: [], removed: [] };

/** How big the celebration burst should feel, per kind of action. */
const MAGNITUDE = { small: 0.6, normal: 1, big: 1.4 } as const;

export function Game() {
    const [selectedIds, setSelectedIds] = useState<AnimalId[]>([]);
    const [isCasting, setIsCasting] = useState(false);
    const [celebration, setCelebration] = useState<{ epoch: number; magnitude: number }>({ epoch: 0, magnitude: 1 });
    const [hasInteracted, setHasInteracted] = useState(false);
    const [useLabMode, setUseLabMode] = useState(false); // Simple tap-based mode by default
    const [selectionPulse, setSelectionPulse] = useState<SelectionPulse>(NO_PULSE);
    const [muted, setMuted] = useState(false);
    const [effects, setEffects] = useState<Partial<Record<AnimalId, AnimalEffectState>>>({});

    const surpriseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const castingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const restoreMuteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Restore the parent's sound preference shortly after mount (after the
    // server-rendered markup has matched), so there is never a hydration flip.
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                const stored = window.localStorage.getItem(MUTED_STORAGE_KEY);
                if (stored !== null) setMuted(stored === 'true');
            } catch {
                // Private browsing can block storage — stay unmuted, stay happy.
            }
        }, 0);
        restoreMuteTimer.current = timer;
        return () => clearTimeout(timer);
    }, []);

    // Mirror the preference onto the audio engine. The engine owns the final
    // gate (it checks muted inside every play method), so this silences sounds
    // triggered anywhere — shelves, sorcerer, lab — not just the calls below.
    // The optional-call keeps us decoupled from the engine's exact API shape.
    useEffect(() => {
        (audioEngine as unknown as { setMuted?: (m: boolean) => void }).setMuted?.(muted);
    }, [muted]);

    useEffect(() => () => {
        surpriseTimers.current.forEach(clearTimeout);
        if (castingTimer.current) clearTimeout(castingTimer.current);
    }, []);

    const allSelected = selectedIds.length === ALL_ANIMAL_IDS.length && selectedIds.length > 0;
    const hasSelection = selectedIds.length > 0;

    /** Play a sound unless the parent muted the game. */
    const play = (makeSound: () => void) => {
        if (!muted) makeSound();
    };

    const triggerCelebration = (magnitude: number = MAGNITUDE.normal) => {
        setCelebration(prev => ({ epoch: prev.epoch + 1, magnitude }));
    };

    /**
     * ZERO DEAD ENDS: actions are never refused. With no friend chosen yet,
     * pick ALL friends with a happy magic flourish, then let the action apply.
     */
    const resolveTargets = (): AnimalId[] => {
        if (selectedIds.length > 0) return selectedIds;
        changeSelection(ALL_ANIMAL_IDS);
        setHasInteracted(true);
        play(() => audioEngine.playMagic());
        return ALL_ANIMAL_IDS;
    };

    /** Central selection changer that also emits one-shot card animations. */
    const changeSelection = (next: AnimalId[]) => {
        const added = next.filter(id => !selectedIds.includes(id));
        const removed = selectedIds.filter(id => !next.includes(id));
        setSelectedIds(next);
        if (added.length > 0 || removed.length > 0) {
            setSelectionPulse(prev => ({ epoch: prev.epoch + 1, added, removed }));
        }
    };

    const beginCast = () => {
        setIsCasting(true);
        if (castingTimer.current) clearTimeout(castingTimer.current);
        castingTimer.current = setTimeout(() => setIsCasting(false), 500);
    };

    const handleUsePotion = (type: PotionType) => {
        const targets = resolveTargets();
        beginCast();
        triggerCelebration();

        switch (type) {
            case 'growth': play(() => audioEngine.playGrowth()); break;
            case 'shrink': play(() => audioEngine.playShrink()); break;
            case 'red': case 'purple': play(() => audioEngine.playMagic()); break;
            case 'rainbow': play(() => audioEngine.playRainbow()); break;
            case 'sunshine': play(() => audioEngine.playSunshine()); break;
        }

        setEffects(prev => {
            const updated = { ...prev };
            targets.forEach(id => {
                const current = updated[id] || { scale: 1, filter: '', classes: [], treats: [] };
                const next = { ...current };

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
        const targets = resolveTargets();
        beginCast();
        triggerCelebration();

        if (type === 'hotdog') play(() => audioEngine.playHotdog());
        else play(() => audioEngine.playPresent());

        setEffects(prev => {
            const updated = { ...prev };
            targets.forEach(id => {
                const isDog = id === 'husky';
                const finalType = (type === 'present' && isDog) ? 'bone' : type;
                const current = updated[id] || { scale: 1, filter: '', classes: [], treats: [] };
                updated[id] = {
                    ...current,
                    // Cap the emoji pile so treat-spam can't grow the DOM forever.
                    treats: [...current.treats, finalType].slice(-MAX_TREATS_PER_ANIMAL)
                };
            });
            return updated;
        });
    };

    const handleSelect = (id: AnimalId) => {
        setHasInteracted(true);
        changeSelection(
            selectedIds.includes(id)
                ? selectedIds.filter(x => x !== id)
                : [...selectedIds, id]
        );
    };

    const handleToggleSelectAll = () => {
        play(() => audioEngine.playPop());
        changeSelection(allSelected ? [] : [...ALL_ANIMAL_IDS]);
    };

    const handleReset = () => {
        if (!hasSelection) {
            // Nothing to reset — keep it cheerful, never scolding.
            play(() => audioEngine.playPop());
            return;
        }
        const targets = selectedIds;
        setEffects(prev => {
            const updated = { ...prev };
            targets.forEach(id => {
                delete updated[id];
            });
            return updated;
        });
        play(() => audioEngine.playMagic());
        triggerCelebration(MAGNITUDE.small);
    };

    // Surprise: walk a Markov chain of visual effects across the selected animals.
    const handleSurprise = () => {
        const targets = resolveTargets();
        setHasInteracted(true);
        surpriseTimers.current.forEach(clearTimeout);
        surpriseTimers.current = [];
        beginCast();

        const path = walkFx(4);
        path.forEach((fx, i) => {
            const timer = setTimeout(() => {
                const v = FX_VISUALS[fx];
                switch (v.sound) {
                    case 'growth': play(() => audioEngine.playGrowth()); break;
                    case 'shrink': play(() => audioEngine.playShrink()); break;
                    case 'rainbow': play(() => audioEngine.playRainbow()); break;
                    case 'sunshine': play(() => audioEngine.playSunshine()); break;
                    default: play(() => audioEngine.playMagic());
                }
                triggerCelebration(MAGNITUDE.big);
                setEffects(prev => {
                    const updated = { ...prev };
                    targets.forEach(id => {
                        const current = updated[id] || { scale: 1, filter: '', classes: [], treats: [] };
                        updated[id] = {
                            ...current,
                            scale: v.scale,
                            filter: v.filter,
                            classes: [...v.classes],
                        };
                    });
                    return updated;
                });
            }, i * 700);
            surpriseTimers.current.push(timer);
        });

        const done = setTimeout(() => setIsCasting(false), path.length * 700);
        surpriseTimers.current.push(done);
    };

    // Handle brewed potion from AlchemistLaboratory
    const handleApplyBrewedEffect = (effect: BrewedEffect) => {
        const targets = resolveTargets();
        beginCast();
        triggerCelebration(MAGNITUDE.big);

        // Apply the effect to all selected characters
        setEffects(prev => {
            const updated = { ...prev };
            targets.forEach(id => {
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
    };

    const toggleMuted = () => {
        const next = !muted;
        setMuted(next);
        try {
            window.localStorage.setItem(MUTED_STORAGE_KEY, String(next));
        } catch {
            // Storage unavailable — the toggle still works for this visit.
        }
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
        <div
            data-game-surface=""
            className="w-full h-screen flex flex-col items-center justify-between p-2 relative overflow-y-auto"
            style={{
                background: 'var(--bg-magical-sky)',
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
        >

            {/* Iridescent Background */}
            <IridescentBackground />

            {/* Celebration Overlay */}
            <CelebrationOverlay burst={celebration} />

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
                <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-1">
                    {/* Mode Toggle */}
                    <button
                        type="button"
                        onClick={() => setUseLabMode(!useLabMode)}
                        className={cn(
                            "btn-kid rounded-full text-sm font-semibold transition-all",
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
                        type="button"
                        onClick={handleToggleSelectAll}
                        className={cn(
                            "btn-kid rounded-full text-sm font-semibold transition-all",
                            "bg-white/10 backdrop-blur-sm border border-white/20",
                            "hover:bg-white/20 hover:scale-105 active:scale-95"
                        )}
                    >
                        <span className="text-white/90">
                            {allSelected ? '🚫 Deselect All' : '✅ Select All'}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        className={cn(
                            "btn-kid rounded-full text-sm font-semibold transition-all",
                            "bg-white/10 backdrop-blur-sm border border-white/20",
                            "hover:bg-white/20 hover:scale-105 active:scale-95"
                        )}
                    >
                        <span className="text-white/90">🔄 Reset</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleSurprise}
                        className={cn(
                            "btn-kid rounded-full text-sm font-semibold transition-all",
                            "bg-gradient-to-r from-pink-500/40 to-purple-500/40 backdrop-blur-sm border border-pink-300/40",
                            "hover:scale-105 active:scale-95",
                            "ready-glow"
                        )}
                    >
                        <span className="text-white">🎲 Surprise!</span>
                    </button>

                    {/* Parent sound toggle — state is signalled by the label
                        alone (no aria-pressed, which would read as
                        "Turn sounds on, pressed"). */}
                    <button
                        type="button"
                        onClick={toggleMuted}
                        aria-label={muted ? 'Turn sounds on' : 'Turn sounds off'}
                        title={muted ? 'Turn sounds on' : 'Turn sounds off'}
                        className={cn(
                            "btn-kid rounded-full text-sm font-semibold transition-all",
                            "bg-white/10 backdrop-blur-sm border border-white/20",
                            "hover:bg-white/20 hover:scale-105 active:scale-95"
                        )}
                    >
                        <span className="text-white/90" aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
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
                    selectionPulse={selectionPulse}
                    silent={muted}
                />
            </main>

            {/* Footer - Action Shelves */}
            <footer className="w-full mb-2 z-10 px-2 flex justify-center flex-shrink-0">
                {useLabMode ? (
                    /* Alchemy Laboratory Mode */
                    <AlchemistLaboratory onApplyEffect={handleApplyBrewedEffect} />
                ) : (
                    /* Classic Mode: Original shelves */
                    <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                        <PotionShelf onUsePotion={handleUsePotion} isReady={hasSelection} />
                        <TreatShelf onGiveTreat={handleGiveTreat} isReady={hasSelection} />
                    </div>
                )}
            </footer>
        </div >
    );
}
