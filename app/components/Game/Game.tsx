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
import { tickLight, tickCelebrate, setHapticsMuted } from './haptics';
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

/**
 * Music-engine contract note: startMusic/stopMusic/isMusicPlaying are
 * compile-checked members of AudioEngine now (delight phase landed), so all
 * calls below are direct. The local `musicRef` bookkeeping stays as a
 * double-start shield and mute-lifecycle memory on top of the engine.
 */

/** How big the celebration burst should feel, per kind of action. */
const MAGNITUDE = { small: 0.6, normal: 1, big: 1.4 } as const;

/**
 * Minimum spacing between FULL celebration parties (buzz + confetti + flash).
 * Generous enough that the Surprise! walk's 700ms steps all still land.
 */
const CELEBRATION_REFRACTORY_MS = 400;

/** Local music-lifecycle bookkeeping (see the mute-mirror effect below). */
interface MusicMemory {
    /** A user gesture has happened somewhere on the game surface. */
    unlocked: boolean;
    /** WE believe the loop is live (our side of the double-start guard). */
    playing: boolean;
    /** Music was live when the parent muted → restore exactly that on unmute. */
    resumeOnUnmute: boolean;
}

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

    // Freshest mute state for stable callbacks (events fire between renders).
    const mutedRef = useRef(false);
    // Music lifecycle memory — refs keep every tap handler identity-stable.
    const musicRef = useRef<MusicMemory>({ unlocked: false, playing: false, resumeOnUnmute: false });
    // Celebration budget (see triggerCelebration): timestamp of the last FULL party.
    const lastCelebrationAtRef = useRef(0);

    /**
     * Music calls are garnish: a device-specific audio failure (dead audio
     * route, exotic browser) must degrade to silence — never break the tap,
     * the render, or an unmount. Every direct engine music call below runs
     * through this guard.
     */
    const safelyMusic = (call: () => void): void => {
        try {
            call();
        } catch {
            // Degrade to silence; local bookkeeping still flips so we don't
            // retry-spam a broken engine.
        }
    };

    /** True if WE or the engine think the background loop is live. */
    const isMusicLive = () => {
        const m = musicRef.current;
        try {
            return m.playing || audioEngine.isMusicPlaying() === true;
        } catch {
            return m.playing;
        }
    };

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

    // Leaving the game stops the loop at the source: an unmounted Game must
    // never leave the engine's self-chaining scheduler ticking behind it.
    useEffect(() => () => {
        surpriseTimers.current.forEach(clearTimeout);
        if (castingTimer.current) clearTimeout(castingTimer.current);
        if (musicRef.current.playing) safelyMusic(() => audioEngine.stopMusic());
        musicRef.current.playing = false;
    }, []);

    // Chrome throttles hidden silent pages' timers toward ~1/min; when the
    // kid comes back, restart the chain through the public API rather than
    // letting them stare at up-to-a-minute of silence.
    useEffect(() => {
        const onVisibilityChange = () => {
            if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
            if (!musicRef.current.unlocked || mutedRef.current || !isMusicLive()) return;
            safelyMusic(() => audioEngine.stopMusic());
            safelyMusic(() => audioEngine.startMusic());
            musicRef.current.playing = true;
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, []);

    // Mirror the parent's preference onto BOTH juice channels. The engine owns
    // the final gate (it checks muted inside every play method), so this
    // silences sounds triggered anywhere — shelves, sorcerer, lab — not just
    // the calls below.
    //
    // POLICY (see haptics.ts): the 🔊/🔇 toggle is ONE calm-switch that gates
    // touch as well as sound, so haptics follow the same flip.
    //
    // Music lifecycle, handled here so every path funnels through one place:
    //  - mute  → stop the loop, but REMEMBER it was live;
    //  - unmute → restore it ONLY if it was live before the mute. A game that
    //    was muted before its first tap stays visually quiet until the kid's
    //    next real tap — unmuting never ambushes a quiet room with music the
    //    child never started.
    useEffect(() => {
        audioEngine.setMuted(muted);
        setHapticsMuted(muted);
        mutedRef.current = muted;

        const m = musicRef.current;
        if (muted) {
            const wasPlaying = isMusicLive();
            if (wasPlaying) safelyMusic(() => audioEngine.stopMusic());
            m.playing = false;
            m.resumeOnUnmute = wasPlaying;
        } else if (m.unlocked && m.resumeOnUnmute && !m.playing) {
            safelyMusic(() => audioEngine.startMusic());
            m.playing = true;
            m.resumeOnUnmute = false;
        }
    }, [muted]);

    const allSelected = isAllSelected(state);
    const hasSelection = selectHasSelection(state);

    /** Play a sound unless the parent muted the game. */
    const play = (makeSound: () => void) => {
        if (!muted) makeSound();
    };

    /**
     * First-tap unlock for the background music loop (browser autoplay
     * policies forbid starting audio outside a user gesture). Called at the
     * top of EVERY direct tap handler — animal cards, shelves, header
     * buttons, lab controls, hint dismiss — and idempotent by construction:
     * once live (locally or per the engine), later taps are a cheap no-op,
     * so the loop can never be double-started from our side even if the
     * engine's own guard is absent.
     *
     * Starting while muted is deliberately skipped; eligibility alone is
     * recorded so a later unmute/next-tap resolves correctly.
     */
    const notifyUserGesture = useCallback(() => {
        const m = musicRef.current;
        m.unlocked = true;
        // When the engine CAN report liveness it is authoritative: if its
        // scheduler died internally (audio-route glitch → its own catch runs
        // stopMusic), our local flag would otherwise stay true forever and
        // orphan the rest of the session in silence. When the probe is absent
        // (pre-API builds, or tests shadowing it away), the local flag below
        // remains the sole double-start guard — pinned by its own twin test.
        const probe = (() => {
            try {
                return audioEngine.isMusicPlaying();
            } catch {
                return undefined; // probe unavailable → local flag is the guard
            }
        })();
        if (typeof probe === 'boolean') m.playing = probe;
        if (!mutedRef.current && !m.playing) {
            safelyMusic(() => audioEngine.startMusic());
            m.playing = true;
        }
    }, []);

    /**
     * Central celebration chokepoint: every big moment funnels through here,
     * which makes it the one place that pairs the visual burst with its
     * longer 20ms haptic tick — under a REFRACTORY WINDOW, because a toddler
     * drumming a shelf re-applies an identical visual state (the reducer
     * resets then reapplies) while each full party would stack confetti and
     * merge 20ms pulses into continuous motor duty. Inside the window we skip
     * the party entirely: handlers' separate LIGHT tick + sound still fire,
     * so feedback never dies — it just stops scaling with spamming. Ticks
     * from inside the Surprise! walk's scheduled steps are still on the
     * original tap's gesture path (the walk exists because of it), mirroring
     * how its sounds are scheduled.
     */
    const triggerCelebration = useCallback((magnitude: number = MAGNITUDE.normal) => {
        const now = Date.now();
        if (now - lastCelebrationAtRef.current < CELEBRATION_REFRACTORY_MS) return;
        lastCelebrationAtRef.current = now;
        tickCelebrate();
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
        notifyUserGesture();
        // Light application tick. On a FIRST tap, triggerCelebration()'s
        // longer 20ms tick replaces this pattern milliseconds later (Vibration
        // API spec: each call cancels the running one) — one clean
        // celebration-length buzz. Under the celebration refractory window
        // (drummed repeat taps), the celebration is skipped and THIS 12ms
        // pulse is what the kid feels instead: feedback without the storm.
        tickLight();
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
    }, [notifyUserGesture, resolveTargets, beginCast, triggerCelebration, muted]);

    const handleGiveTreat = useCallback((type: TreatType) => {
        notifyUserGesture();
        tickLight(); // same two-regime story as potions (see handleUsePotion)
        resolveTargets();
        beginCast();
        triggerCelebration();

        // The husky-always-gets-a-bone swap lives in the reducer.
        dispatch({ type: 'GIVE_TREAT', treatType: type });
        if (!muted) {
            if (type === 'hotdog') audioEngine.playHotdog();
            else audioEngine.playPresent();
        }
    }, [notifyUserGesture, resolveTargets, beginCast, triggerCelebration, muted]);

    const handleSelect = useCallback((id: AnimalId) => {
        notifyUserGesture();
        setHasInteracted(true);
        const isSelected = selectedIds.includes(id);
        emitPulse(isSelected ? { added: [], removed: [id] } : { added: [id], removed: [] });
        dispatch({ type: 'TOGGLE_SELECT_ANIMAL', id });
    }, [notifyUserGesture, selectedIds, emitPulse]);

    const handleToggleSelectAll = useCallback(() => {
        notifyUserGesture();
        if (!muted) audioEngine.playPop();
        if (allSelected) {
            emitPulse({ added: [], removed: [...selectedIds] });
            dispatch({ type: 'CLEAR_SELECTION' });
        } else {
            emitPulse({ added: ALL_ANIMAL_IDS, removed: [] });
            dispatch({ type: 'SELECT_ALL_ANIMALS' });
        }
    }, [notifyUserGesture, allSelected, selectedIds, emitPulse, muted]);

    const handleReset = useCallback(() => {
        notifyUserGesture();
        if (!hasSelection) {
            // Nothing to reset — keep it cheerful, never scolding.
            if (!muted) audioEngine.playPop();
            return;
        }
        dispatch({ type: 'RESET_SELECTED' });
        if (!muted) audioEngine.playMagic();
        triggerCelebration(MAGNITUDE.small);
    }, [notifyUserGesture, hasSelection, triggerCelebration, muted]);

    // Surprise: walk a Markov chain of visual effects across the selected animals.
    const handleSurprise = () => {
        notifyUserGesture();
        // Immediate in-gesture tick: some browsers only honour vibration
        // calls near a real gesture, so this one is guaranteed. Step-0's
        // celebrate timer may replace it milliseconds later (spec
        // cancel-and-replace); if a recent celebration holds the refractory,
        // this 12ms pulse is what the kid feels for pulling the lever.
        tickLight();
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
        notifyUserGesture();
        tickLight(); // brewed potion = same "application" tactile class as shelf potions
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
    }, [notifyUserGesture, resolveTargets, beginCast, triggerCelebration]);

    const toggleMuted = () => {
        // Derive from the ref, not the (possibly same-frame stale) state.
        const next = !mutedRef.current;
        mutedRef.current = next;
        // ATOMIC CALM-SWITCH: flip BOTH gates eagerly so any same-task
        // continuation of this click observes the new state without waiting
        // for React's passive-effect flush. Idempotent with the mirror
        // effect, which re-asserts the same values after render.
        audioEngine.setMuted(next);
        setHapticsMuted(next);
        // Eligibility only: a parent flipping the switch must never itself
        // kick off playback — restore-if-playing is the mute-mirror effect's
        // job. The kid's next real tap starts the loop normally.
        musicRef.current.unlocked = true;
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
                onDismiss={() => {
                    notifyUserGesture();
                    // Often the kid's VERY first tap — acknowledge it in the
                    // hand, gated centrally like every other tick.
                    tickLight();
                    setHasInteracted(true);
                }}
            />

            <Sorcerer isCasting={isCasting} onUserGesture={notifyUserGesture} />

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
                        onClick={() => {
                            notifyUserGesture();
                            setUseLabMode(!useLabMode);
                        }}
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
                    <AlchemistLaboratory onApplyEffect={handleApplyBrewedEffect} onUserGesture={notifyUserGesture} />
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
