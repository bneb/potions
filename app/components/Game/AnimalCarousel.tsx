"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ANIMALS } from '@/lib/data';
import { AnimalId } from '@/lib/schemas';
import { audioEngine } from '@/lib/audio/audioEngine';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { tickLight } from './haptics';
import { Orangutan } from './Orangutan';
import { Trex } from './Trex';
import { Santa } from './Santa';
import { Crocodile } from './Crocodile';
import { Husky } from './Husky';
import { Scorpion } from './Scorpion';
import { Elephant } from './Elephant';
import { Dragon } from './Dragon';


export interface AnimalState {
    scale: number;
    filter: string;
    classes: string[];
    overlays: React.ReactNode[];
}

/** One-shot select/deselect animation info computed centrally in Game. */
export interface SelectionPulse {
    epoch: number;
    added: readonly AnimalId[];
    removed: readonly AnimalId[];
}

interface AnimalCarouselProps {
    selectedIds: AnimalId[];
    onSelect: (id: AnimalId) => void;
    animalStates: Partial<Record<AnimalId, AnimalState>>;
    selectionPulse?: SelectionPulse;
    /** Silence the tap pop (parent muted the game). */
    silent?: boolean;
    className?: string;
}

interface AnimalCardProps {
    animal: (typeof ANIMALS)[number];
    isSelected: boolean;
    state: AnimalState;
    onSelect: (id: AnimalId) => void;
    pulse: SelectionPulse | undefined;
    silent: boolean;
    priority?: boolean;
    /** False for the infinite-scroll clone sets (hidden from AT and Tab). */
    interactive?: boolean;
}

const DEFAULT_STATE: AnimalState = { scale: 1, filter: '', classes: [], overlays: [] };

/**
 * The animal's own species cry, with a hard safety net: a device-specific
 * synth failure must never abort the tap before onSelect — selection IS the
 * game. Header/select-all utility actions intentionally keep the plain pop.
 */
function playVoiceOrPop(animalId: AnimalId): void {
    try {
        audioEngine.playAnimalVoice(animalId);
    } catch {
        audioEngine.playPop();
    }
}

/**
 * Static animal renderers, hoisted to module level: building eight JSX
 * factories once beats rebuilding an eight-entry element record for EACH of
 * the 24 strip items on EVERY render (a measurable reconciliation tax on
 * old tablets — see docs/perf-audit.md finding #3).
 */
const ANIMAL_RENDERERS: Record<AnimalId, (isSelected: boolean, pulse: 'in' | 'out' | null) => React.ReactNode> = {
    orangutan: () => <Orangutan className="scale-75 origin-center" />,
    trex: (_isSelected, pulse) => <Trex className="origin-center" pulse={pulse} />,
    santa: (isSelected) => <Santa className="origin-center" selected={isSelected} />,
    crocodile: (isSelected) => <Crocodile className="origin-center" selected={isSelected} />,
    husky: (isSelected) => <Husky className="origin-center" selected={isSelected} />,
    scorpion: (isSelected) => <Scorpion className="origin-center" selected={isSelected} />,
    elephant: (_isSelected, pulse) => <Elephant className="origin-center" pulse={pulse} />,
    dragon: (_isSelected, pulse) => <Dragon className="origin-center" pulse={pulse} />,
};

function renderAnimalComponent(
    animalId: AnimalId,
    isSelected: boolean,
    pulse: 'in' | 'out' | null,
): React.ReactNode {
    return ANIMAL_RENDERERS[animalId]?.(isSelected, pulse) ?? null;
}

/**
 * One strip card. Memoized: with stable inputs from Game (memoized view
 * objects + stable callbacks), tapping one friend no longer reconciles the
 * other 23 cards' SVG subtrees.
 */
const AnimalCard = React.memo(function AnimalCard({
    animal,
    isSelected,
    state,
    onSelect,
    pulse,
    silent,
    priority = false,
    interactive = true,
}: AnimalCardProps) {
    const reducedMotion = usePrefersReducedMotion();
    const [bumpEpoch, setBumpEpoch] = useState(0);
    const bumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (bumpTimer.current) clearTimeout(bumpTimer.current);
    }, []);

    const handleTap = () => {
        // Haptic tick: gated centrally inside haptics.ts (parent mute mirror,
        // localStorage kill switch, feature detection) — this call site stays
        // dumb. Reduced-motion users still feel it: see the reasoning in
        // haptics.ts (a 12ms static pulse is not motion).
        tickLight();
        if (!silent) playVoiceOrPop(animal.id);
        if (!reducedMotion) {
            setBumpEpoch(e => e + 1);
            if (bumpTimer.current) clearTimeout(bumpTimer.current);
            bumpTimer.current = setTimeout(() => setBumpEpoch(0), 450);
        }
        onSelect(animal.id);
    };

    // One-shot select/deselect animation for this animal, derived purely from
    // the parent's central selection diff — no effects, no cascades. While a
    // friend STAYS selected we keep reporting 'in' so the (forwards-filled)
    // select pose never snaps back when an unrelated friend is tapped.
    const animalPulse = useMemo<'in' | 'out' | null>(() => {
        if (!pulse || pulse.epoch === 0) return isSelected ? 'in' : null;
        if (pulse.added.includes(animal.id)) return 'in';
        if (pulse.removed.includes(animal.id)) return 'out';
        return isSelected ? 'in' : null;
    }, [pulse, animal.id, isSelected]);

    return (
        <button
            type="button"
            aria-pressed={isSelected}
            aria-hidden={interactive ? undefined : true}
            tabIndex={interactive ? undefined : -1}
            onClick={handleTap}
            data-testid={`animal-card-${animal.id}`}
            className={cn(
                "flex-shrink-0 w-36 h-36 md:w-56 md:h-56 relative cursor-pointer transition-all duration-300 snap-center touch-target",
                "flex flex-col items-center justify-center group/animal",
                isSelected ? "scale-105 -translate-y-2 z-10" : "scale-90 opacity-80 hover:opacity-100 hover:scale-95",
                !reducedMotion && bumpEpoch > 0 && "animal-tap-bounce"
            )}
        >
            {/* Selection Spotlight */}
            {isSelected && (
                <div aria-hidden="true" className="absolute inset-0 spotlight rounded-3xl animate-pulse" />
            )}

            {/* Selection Ring */}
            <div
                aria-hidden="true"
                className={cn(
                    "absolute inset-0 rounded-3xl border-4 transition-all z-20 pointer-events-none",
                    isSelected
                        ? "border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.7)]"
                        : "border-transparent group-hover/animal:border-white/30"
                )}
            />

            {/* Animal Container */}
            <div className="relative w-28 h-28 md:w-44 md:h-44 animal-wrapper flex items-center justify-center scale-75 md:scale-100 origin-center">
                {/* Overlays */}
                {state.overlays.map((ov, i) => <React.Fragment key={i}>{ov}</React.Fragment>)}

                <div
                    style={{
                        transform: `scale(${state.scale})`,
                        // Under reduced motion, class-driven keyframes are
                        // dead — so the rainbow potion lands as a STATIC hue
                        // shift instead of being a silent no-op (sound and
                        // confetti with zero visual change was the one gap in
                        // the reduced-motion story).
                        filter:
                            state.filter ||
                            (reducedMotion && state.classes.includes('animate-rainbow')
                                ? 'hue-rotate(180deg) saturate(1.5)'
                                : ''),
                    }}
                    className={cn(
                        "transition-all duration-500 will-change-transform relative",
                        !reducedMotion && state.classes,
                        !reducedMotion && isSelected && "animate-bounce-playful"
                    )}
                >
                    {renderAnimalComponent(animal.id, isSelected, animalPulse) || (
                        <Image
                            src={animal.imageSrc}
                            alt={animal.name}
                            width={176}
                            height={176}
                            className="object-contain drop-shadow-lg"
                            priority={priority}
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
        </button>
    );
});

export function AnimalCarousel({
    selectedIds,
    onSelect,
    animalStates,
    selectionPulse,
    silent = false,
    className,
}: AnimalCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const items = [...ANIMALS, ...ANIMALS, ...ANIMALS];
    const middleSetStart = ANIMALS.length;
    const reducedMotion = usePrefersReducedMotion();

    useEffect(() => {
        if (reducedMotion) return undefined;
        if (scrollRef.current) {
            const container = scrollRef.current;
            const timer = setTimeout(() => {
                const itemWidth = container.scrollWidth / 3;
                container.scrollLeft = itemWidth;
            }, 100);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [reducedMotion]);

    // Infinite-strip wrap-around, rAF-throttled and attached as a passive
    // listener: layout reads/writes happen at most once per frame instead of
    // on every scroll event, and the listener is removed on unmount.
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return undefined;

        let frame: number | null = null;
        const handleScroll = () => {
            if (frame !== null) return;
            frame = requestAnimationFrame(() => {
                frame = null;
                const scrollLeft = container.scrollLeft;
                const oneSetWidth = container.scrollWidth / 3;
                if (scrollLeft >= oneSetWidth * 2) {
                    container.scrollLeft = scrollLeft - oneSetWidth;
                } else if (scrollLeft <= 5) {
                    container.scrollLeft = scrollLeft + oneSetWidth;
                }
            });
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (frame !== null) cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <div
            className={cn("relative w-full h-[200px] md:h-[280px] flex items-center overflow-hidden", className)}
            style={{
                maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
            }}
        >
            <div
                ref={scrollRef}
                className="flex gap-6 overflow-x-auto no-scrollbar w-full h-full items-center px-[50vw] snap-x snap-mandatory"
                style={{ scrollBehavior: 'auto' }}
            >
                {items.map((animal, index) => (
                    <AnimalCard
                        key={`${animal.id}-${index}`}
                        animal={animal}
                        isSelected={selectedIds.includes(animal.id)}
                        state={animalStates[animal.id] || DEFAULT_STATE}
                        onSelect={onSelect}
                        pulse={selectionPulse}
                        silent={silent}
                        priority={index >= middleSetStart && index < middleSetStart + ANIMALS.length}
                        interactive={index >= middleSetStart && index < middleSetStart + ANIMALS.length}
                    />
                ))}
            </div>
        </div>
    );
}
