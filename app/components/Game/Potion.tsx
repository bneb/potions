"use client";

import React, { useMemo } from 'react';
import { PotionType } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import styles from './potion.module.css';

// === PROCEDURAL CONFIG ===
// Each potion type maps to visual properties for mixing/matching

interface PotionConfig {
    bottleShape: 'round' | 'tall' | 'vial' | 'square';
    capStyle: 'cork' | 'metal';
    variant: string;
    label?: string;
    bubbleCount: number;
}

const POTION_CONFIGS: Record<PotionType, PotionConfig> = {
    growth: {
        bottleShape: 'round',
        capStyle: 'cork',
        variant: 'variantGrowth',
        label: 'GROW',
        bubbleCount: 5,
    },
    shrink: {
        bottleShape: 'vial',
        capStyle: 'metal',
        variant: 'variantShrink',
        label: 'TINY',
        bubbleCount: 4,
    },
    red: {
        bottleShape: 'tall',
        capStyle: 'cork',
        variant: 'variantRed',
        label: 'LOVE',
        bubbleCount: 5,
    },
    purple: {
        bottleShape: 'round',
        capStyle: 'metal',
        variant: 'variantPurple',
        label: 'MYST',
        bubbleCount: 4,
    },
    rainbow: {
        bottleShape: 'square',
        capStyle: 'cork',
        variant: 'variantRainbow',
        label: 'MAGIC',
        bubbleCount: 5,
    },
    sunshine: {
        bottleShape: 'tall',
        capStyle: 'cork',
        variant: 'variantSunshine',
        label: 'GLOW',
        bubbleCount: 4,
    },
};

// Bottle shape class mapping
const BOTTLE_CLASSES: Record<string, string> = {
    round: styles.bottleRound,
    tall: styles.bottleTall,
    vial: styles.bottleVial,
    square: styles.bottleSquare,
};

interface PotionProps {
    type: PotionType;
    disabled?: boolean;
    isReady?: boolean;
    onClick?: () => void;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export function Potion({
    type,
    disabled = false,
    isReady = false,
    onClick,
    size = 'md',
    showLabel = false,
}: PotionProps) {
    // Get config for this potion type
    const config = useMemo(() => POTION_CONFIGS[type], [type]);

    // Generate bubble elements
    const bubbles = useMemo(() => {
        return Array.from({ length: config.bubbleCount }, (_, i) => (
            <div key={i} className={styles.bubble} />
        ));
    }, [config.bubbleCount]);

    // Size scaling
    const sizeClasses = {
        sm: 'scale-75',
        md: 'scale-100',
        lg: 'scale-125',
    };

    return (
        <div
            className={cn(
                styles.potionStage,
                styles[config.variant],
                sizeClasses[size],
                disabled && styles.disabled,
                isReady && styles.ready
            )}
            onClick={disabled ? undefined : onClick}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
        >
            {/* Main Potion Rig */}
            <div className={styles.potionRig}>
                {/* Bottle Container */}
                <div className={cn(styles.bottleRound, BOTTLE_CLASSES[config.bottleShape])}>
                    {/* Glass Body */}
                    <div className={styles.bottleBody}>
                        {/* Liquid Container */}
                        <div className={styles.liquidContainer}>
                            <div className={styles.liquidFill}>
                                <div className={styles.liquidSurface} />
                            </div>
                            <div className={styles.liquidGlow} />
                        </div>

                        {/* Bubbles */}
                        <div className={styles.bubblesContainer}>
                            {bubbles}
                        </div>

                        {/* Glass Highlights */}
                        <div className={cn(styles.glassHighlight, styles.primary)} />
                        <div className={cn(styles.glassHighlight, styles.secondary)} />
                        <div className={styles.glassReflection} />

                        {/* Label Tag */}
                        {showLabel && config.label && (
                            <div className={styles.labelTag}>
                                <span className={styles.labelText}>{config.label}</span>
                            </div>
                        )}
                    </div>

                    {/* Bottle Neck */}
                    <div className={styles.bottleNeck} />

                    {/* Bottle Lip */}
                    <div className={styles.bottleLip} />
                </div>

                {/* Cork / Cap */}
                <div className={cn(
                    styles.corkGroup,
                    config.capStyle === 'metal' && styles.metalCap
                )}>
                    <div className={styles.corkBody}>
                        <div className={styles.corkGrain} />
                    </div>
                    <div className={styles.corkTop} />
                </div>
            </div>

            {/* Shadow */}
            <div className={styles.potionShadow} />
        </div>
    );
}

// === PROCEDURAL GENERATION UTILITIES ===

/**
 * Generate a random potion config for testing/demo
 */
export function generateRandomPotionConfig(): PotionConfig {
    const shapes: Array<'round' | 'tall' | 'vial' | 'square'> = ['round', 'tall', 'vial', 'square'];
    const caps: Array<'cork' | 'metal'> = ['cork', 'metal'];
    const variants = [
        'variantGrowth',
        'variantShrink',
        'variantRed',
        'variantPurple',
        'variantRainbow',
        'variantSunshine',
    ];

    return {
        bottleShape: shapes[Math.floor(Math.random() * shapes.length)],
        capStyle: caps[Math.floor(Math.random() * caps.length)],
        variant: variants[Math.floor(Math.random() * variants.length)],
        bubbleCount: Math.floor(Math.random() * 3) + 3, // 3-5 bubbles
    };
}

/**
 * Procedurally generate a unique potion from a seed
 * Useful for consistent random generation
 */
export function generatePotionFromSeed(seed: number): PotionConfig {
    const shapes: Array<'round' | 'tall' | 'vial' | 'square'> = ['round', 'tall', 'vial', 'square'];
    const caps: Array<'cork' | 'metal'> = ['cork', 'metal'];
    const variants = [
        'variantGrowth',
        'variantShrink',
        'variantRed',
        'variantPurple',
        'variantRainbow',
        'variantSunshine',
    ];

    // Simple seeded random
    const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
    };

    return {
        bottleShape: shapes[Math.floor(seededRandom(seed * 1) * shapes.length)],
        capStyle: caps[Math.floor(seededRandom(seed * 2) * caps.length)],
        variant: variants[Math.floor(seededRandom(seed * 3) * variants.length)],
        bubbleCount: Math.floor(seededRandom(seed * 4) * 3) + 3,
    };
}

export default Potion;
