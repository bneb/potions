"use client";

import React, { useMemo } from 'react';
import { BrewedEffect } from '@/lib/schemas';
import { EFFECT_VISUALS, getRecipeName } from '@/lib/potionLogic';
import { cn } from '@/lib/utils';
import styles from './potionPreview.module.css';

interface PotionPreviewProps {
    brewedEffect: BrewedEffect | null;
    blendedColor: string;
    ingredientCount: number;
    isNewDiscovery: boolean;
    onApply: () => void;
    disabled?: boolean;
}

export function PotionPreview({
    brewedEffect,
    blendedColor,
    ingredientCount,
    isNewDiscovery,
    onApply,
    disabled = false,
}: PotionPreviewProps) {

    const visual = useMemo(() => {
        if (!brewedEffect) return null;
        return EFFECT_VISUALS[brewedEffect.primary] ?? EFFECT_VISUALS['mystery'];
    }, [brewedEffect]);

    const recipeName = useMemo(() => {
        if (!brewedEffect) return '???';
        return getRecipeName(brewedEffect);
    }, [brewedEffect]);

    const fillLevel = Math.min(100, ingredientCount * 20 + 10);
    const hasEffect = brewedEffect && brewedEffect.primary !== 'mystery';

    return (
        <div className={cn(styles.previewContainer, hasEffect && styles.ready)}>
            {/* Title */}
            <h4 className={styles.title}>
                <span>🧪</span>
                <span>Result</span>
            </h4>

            {/* Bottle Preview */}
            <div className={cn(styles.bottle, hasEffect && styles.glowing)}>
                {/* Bottle Body */}
                <div className={styles.bottleBody}>
                    {/* Liquid */}
                    <div
                        className={styles.liquid}
                        style={{
                            backgroundColor: blendedColor,
                            height: `${fillLevel}%`,
                        }}
                    >
                        <div className={styles.liquidSurface} />
                        <div className={styles.bubbles}>
                            <div className={styles.bubble} />
                            <div className={styles.bubble} />
                            <div className={styles.bubble} />
                        </div>
                    </div>

                    {/* Glass Shine */}
                    <div className={styles.shine} />
                </div>

                {/* Neck */}
                <div className={styles.neck} />

                {/* Cork */}
                <div className={styles.cork} />

                {/* Glow Effect */}
                {hasEffect && (
                    <div
                        className={styles.glow}
                        style={{ backgroundColor: visual?.color ?? blendedColor }}
                    />
                )}
            </div>

            {/* Effect Label */}
            <div className={styles.effectLabel}>
                {isNewDiscovery && hasEffect && (
                    <span className={styles.newBadge}>🆕 NEW!</span>
                )}
                <span className={styles.effectName}>{recipeName}</span>
            </div>

            {/* Stats (if has effect) */}
            {hasEffect && brewedEffect && (
                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span className={styles.statIcon}>💪</span>
                        <div
                            className={styles.statBar}
                            style={{ width: `${brewedEffect.intensity * 50}%` }}
                        />
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statIcon}>⏱️</span>
                        <div
                            className={styles.statBar}
                            style={{ width: `${brewedEffect.duration * 10}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Apply Button */}
            <button
                className={cn(
                    styles.applyButton,
                    !hasEffect && styles.disabled,
                    brewedEffect?.isVolatile && styles.volatile
                )}
                onClick={onApply}
                disabled={disabled || !hasEffect}
            >
                {brewedEffect?.isVolatile ? (
                    <>
                        <span>⚠️</span>
                        <span>Volatile!</span>
                    </>
                ) : (
                    <>
                        <span>✨</span>
                        <span>Apply!</span>
                    </>
                )}
            </button>
        </div>
    );
}

export default PotionPreview;
