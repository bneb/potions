"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useReducer } from 'react';
import { AnimalCarousel, AnimalState, SelectionPulse } from './AnimalCarousel';
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
import {
    gameReducer,
    createInitialGameState,
    deriveAnimalViews,
    hasSelection as selectHasSelection,
    isAllSelected,
} from '@/lib/gameState';
import { walkFx, FX_VISUALS } from '@/lib/markov';
import { cn } from '@/lib/utils';

const ALL_ANIMAL_IDS: AnimalId[] = ANIMALS.map(a => a.id);
const MUTED_STORAGE_KEY = 'potions-muted';
const NO_PULSE: SelectionPulse = { epoch: 0, added: [], removed: [] };

/** How big the celebration burst should feel, per kind of action. */
const MAGNITUDE = { small: 0.6, normal: 1, big: 1.4 } as const;

export function Game() {
    // The game's brain lives in the pure, unit-tested reducer (app/lib/gameState.ts).
    // This component is now a thin policy + presentation layer on top of it.
    const [state, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);
    const selectedIds = state.selectedIds;
    const [isCasting, setIsCasting] = useState(false);
    const [celebration, setCelebration] = useState<{ epoch: number; magnitude: number }>({ epoch: 0, magnitude: 1 });
    const [hasInteracted, setHasInteracted] = useState(false);
    const [useLabMode, setUseLabMode] = useState(false); // Simple tap-based mode by default
    const [selectionPulse, setSelectionPulse] = useState<SelectionPulse>(NO_PULSE);
    const [muted, setMuted] = useState(false);

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
    useEffect(() => {
        audioEngine.setMuted(muted);
    }, [muted]);

    useEffect(() => () => {
        surpriseTimers.current.forEach(clearTimeout);
        if (castingTimer.current) clearTimeout(castingTimer.current);
    }, []);

    const allSelected = isAllSelected(state);
    const hasSelection = selectHasSelection(state);

    /** Play a sound unless the parent muted the game. */
    const play = (makeSound: () => void) => {
        if (!muted) makeSound();
    };

    const triggerCelebration = useCallback((magnitude: number = MAGNITUDE.normal) => {
        setCelebration(prev => ({ epoch: prev.epoch + 1, magnitude }));
    }, []);

    /** One-shot card animations derived from a selection change, pre-dispatch.
     *  Defined first: the handlers below capture it at event time. */
    const emitPulse = useCallback((diff: { added: readonly AnimalId[]; removed: readonly AnimalId[] }) => {
        if (diff.added.length > 0 || diff.removed.length > 0) {
            setSelectionPulse(prev => ({ epoch: prev.epoch + 1, ...diff }));
        }
    }, []);

    /**
     * ZERO DEAD ENDS: actions are never refused. With no friend chosen yet,
     * pick ALL friends with a happy magic flourish, then let the action apply.
     * (Component-level policy: the reducer itself stays policy-free.)
     */
    const resolveTargets = useCallback((): AnimalId[] => {
        if (selectedIds.length > 0) return selectedIds;
        dispatch({ type: 'SELECT_ALL_ANIMALS' });
        emitPulse({ added: ALL_ANIMAL_IDS, removed: [] });
        setHasInteracted(true);
        if (!muted) audioEngine.playMagic();
        return ALL_ANIMAL_IDS;
    }, [selectedIds, muted, emitPulse]);

    const beginCast = useCallback(() => {
        setIsCasting(true);
        if (castingTimer.current) clearTimeout(castingTimer.current);
        castingTimer.current = setTimeout(() => setIsCasting(false), 500);
    }, []);

    const handleUsePotion = useCallback((type: PotionType) => {
        resolveTargets();
        beginCast();
        triggerCelebration();

        // Inline muted guard (NOT a `play` closure): these callbacks are
        // memoized, so any value they read must be in their dependency list.
        if (!muted) {
            switch (type) {
                case 'growth': audioEngine.playGrowth(); break;
                case 'shrink': audioEngine.playShrink(); break;
                case 'red': case 'purple': audioEngine.playMagic(); break;
                case 'rainbow': audioEngine.playRainbow(); break;
                case 'sunshine': audioEngine.playSunshine(); break;
            }
        }

        dispatch({ type: 'APPLY_POTION', potionType: type });
    }, [resolveTargets, beginCast, triggerCelebration, muted]);

    const handleGiveTreat = useCallback((type: TreatType) => {
        resolveTargets();
        beginCast();
        triggerCelebration();

        // The husky-always-gets-a-bone swap lives in the reducer.
        dispatch({ type: 'GIVE_TREAT', treatType: type });
        if (!muted) {
            if (type === 'hotdog') audioEngine.playHotdog();
            else audioEngine.playPresent();
        }
    }, [resolveTargets, beginCast, triggerCelebration, muted]);

    const handleSelect = useCallback((id: AnimalId) => {
        setHasInteracted(true);
        const isSelected = selectedIds.includes(id);
        emitPulse(isSelected ? { added: [], removed: [id] } : { added: [id], removed: [] });
        dispatch({ type: 'TOGGLE_SELECT_ANIMAL', id });
    }, [selectedIds, emitPulse]);

    const handleToggleSelectAll = useCallback(() => {
        if (!muted) audioEngine.playPop();
        if (allSelected) {
            emitPulse({ added: [], removed: [...selectedIds] });
            dispatch({ type: 'CLEAR_SELECTION' });
        } else {
            emitPulse({ added: ALL_ANIMAL_IDS, removed: [] });
            dispatch({ type: 'SELECT_ALL_ANIMALS' });
        }
    }, [allSelected, selectedIds, emitPulse, muted]);

    const handleReset = useCallback(() => {
        if (!hasSelection) {
            // Nothing to reset — keep it cheerful, never scolding.
            if (!muted) audioEngine.playPop();
            return;
        }
        dispatch({ type: 'RESET_SELECTED' });
        if (!muted) audioEngine.playMagic();
        triggerCelebration(MAGNITUDE.small);
    }, [hasSelection, triggerCelebration, muted]);

    // Surprise: walk a Markov chain of visual effects across the selected animals.
    const handleSurprise = () => {
        // FREEZE THE CAST at tap time (legacy semantics): mid-cascade taps must
        // never strand a dancing friend or kill the remaining steps — the kid
        // gets their full 2.8 seconds of magic no matter what they poke.
        const cast = resolveTargets();
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
                dispatch({
                    type: 'APPLY_SURPRISE_STEP',
                    scale: v.scale,
                    filter: v.filter,
                    classes: [...v.classes],
                    targetIds: cast,
                });
            }, i * 700);
            surpriseTimers.current.push(timer);
        });

        const done = setTimeout(() => setIsCasting(false), path.length * 700);
        surpriseTimers.current.push(done);
    };

    // Handle brewed potion from AlchemistLaboratory
    const handleApplyBrewedEffect = useCallback((effect: BrewedEffect) => {
        resolveTargets();
        beginCast();
        triggerCelebration(MAGNITUDE.big);

        // Effect math (scale/filter/classes) lives in potionLogic via the reducer.
        dispatch({
            type: 'APPLY_BREWED_EFFECT',
            primary: effect.primary,
            intensity: effect.intensity,
            visualModifier: effect.visualModifier,
        });
    }, [resolveTargets, beginCast, triggerCelebration]);

    const toggleMuted = () => {
        const next = !muted;
        setMuted(next);
        try {
            window.localStorage.setItem(MUTED_STORAGE_KEY, String(next));
        } catch {
            // Storage unavailable — the toggle still works for this visit.
        }
    };

    // Compute derived view state for carousel — memoized on the reducer state,
    // so unrelated re-renders (mute flips, celebration bursts, casting glow)
    // reuse the same objects and never rebuild the 24 strip items. The reducer's
    // structural sharing means `state` only changes identity when game data does.
    const animalStates = useMemo<Partial<Record<AnimalId, AnimalState>>>(() => {
        const views = deriveAnimalViews(state);
        const result: Partial<Record<AnimalId, AnimalState>> = {};
        ANIMALS.forEach(a => {
            const view = views[a.id];
            // Views arrive pre-capped at MAX_VISIBLE_TREATS emojis.
            const overlays = view.overlayEmojis.map((emoji, i) => {
                const isSunglasses = view.overlayKinds[i] === 'sunglasses';
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
                        {emoji}
                    </div>
                );
            });

            if (view.isSunshineGlow) {
                overlays.unshift(
                    <div key="sun" className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full animate-pulse z-0" />
                );
            }

            result[a.id] = {
                scale: view.scale,
                filter: view.filter,
                classes: view.classes,
                overlays
            };
        });
        return result;
    }, [state]);

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
