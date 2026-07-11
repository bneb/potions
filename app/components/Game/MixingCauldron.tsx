"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { IngredientId } from '@/lib/schemas';
import { INGREDIENTS } from '@/lib/data';
import { cn } from '@/lib/utils';
import styles from './cauldron.module.css';

interface MixingCauldronProps {
    ingredients: IngredientId[];
    heat: number;
    onIngredientDrop: (ingredient: IngredientId) => void;
    onIngredientRemove: (index: number) => void;
    blendedColor: string;
    isBrewing: boolean;
}

export function MixingCauldron({
    ingredients,
    heat,
    onIngredientDrop,
    onIngredientRemove,
    blendedColor,
    isBrewing,
}: MixingCauldronProps) {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const ingredientId = e.dataTransfer.getData('ingredient') as IngredientId;
        if (ingredientId) {
            onIngredientDrop(ingredientId);
        }
    }, [onIngredientDrop]);

    // Generate bubbles based on heat level
    // Using deterministic values based on index to avoid hydration mismatch
    const bubbles = useMemo(() => {
        const bubbleCount = heat * 3 + 2;
        // Seeded pseudo-random function for consistent SSR/CSR rendering
        const seededRandom = (seed: number) => {
            const x = Math.sin(seed * 9999) * 10000;
            return x - Math.floor(x);
        };
        return Array.from({ length: bubbleCount }, (_, i) => {
            const size = 8 + seededRandom(i * 7) * 16;
            const left = 20 + seededRandom(i * 13) * 60;
            const delay = seededRandom(i * 17) * 2;
            const duration = 1 + seededRandom(i * 23) * 1.5;
            return (
                <div
                    key={i}
                    className={styles.bubble}
                    style={{
                        width: size,
                        height: size,
                        left: `${left}%`,
                        animationDelay: `${delay}s`,
                        animationDuration: `${duration}s`,
                    }}
                />
            );
        });
    }, [heat]);

    // Get ingredient badges
    const ingredientBadges = useMemo(() => {
        return ingredients.map((id, index) => {
            const ingredient = INGREDIENTS.find(i => i.id === id);
            if (!ingredient) return null;
            return (
                <button
                    key={`${id}-${index}`}
                    onClick={() => onIngredientRemove(index)}
                    className={styles.ingredientBadge}
                    title={`Remove ${ingredient.name}`}
                    aria-label={`Remove ${ingredient.name}`}
                >
                    <span className={styles.badgeEmoji}>{ingredient.emoji}</span>
                    <span className={styles.badgeRemove}>×</span>
                </button>
            );
        });
    }, [ingredients, onIngredientRemove]);

    return (
        <div className={styles.cauldronContainer}>
            {/* Ingredient Badges (above cauldron) */}
            <div className={styles.badgesRow}>
                {ingredientBadges}
            </div>

            {/* Main Cauldron */}
            <div
                className={cn(
                    styles.cauldron,
                    isDragOver && styles.dragOver,
                    isBrewing && styles.brewing
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Cauldron Rim */}
                <div className={styles.rim}>
                    <div className={styles.rimHighlight} />
                </div>

                {/* Cauldron Body */}
                <div className={styles.body}>
                    {/* Liquid */}
                    <div
                        className={styles.liquid}
                        style={{
                            backgroundColor: ingredients.length > 0 ? blendedColor : '#6B5B95',
                            opacity: ingredients.length > 0 ? 1 : 0.5,
                        }}
                    >
                        {/* Liquid Surface Wave */}
                        <div className={styles.liquidSurface} />

                        {/* Bubbles */}
                        <div className={styles.bubblesContainer}>
                            {bubbles}
                        </div>

                        {/* Glow Effect */}
                        <div
                            className={styles.glow}
                            style={{
                                backgroundColor: blendedColor,
                                opacity: heat * 0.15,
                            }}
                        />
                    </div>

                    {/* Steam (visible at high heat) */}
                    {heat >= 3 && (
                        <div className={styles.steamContainer}>
                            <div className={styles.steam} style={{ animationDelay: '0s' }} />
                            <div className={styles.steam} style={{ animationDelay: '0.5s' }} />
                            <div className={styles.steam} style={{ animationDelay: '1s' }} />
                        </div>
                    )}

                    {/* Drop Zone Indicator */}
                    {isDragOver && (
                        <div className={styles.dropIndicator}>
                            <span className={styles.dropText}>Drop here!</span>
                        </div>
                    )}

                    {/* Empty State */}
                    {ingredients.length === 0 && !isDragOver && (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyEmoji}>🧪</span>
                            <span className={styles.emptyText}>Tap ingredients to add!</span>
                        </div>
                    )}
                </div>

                {/* Cauldron Base */}
                <div className={styles.base} />

                {/* Cauldron Feet */}
                <div className={styles.feet}>
                    <div className={styles.foot} />
                    <div className={styles.foot} />
                    <div className={styles.foot} />
                </div>
            </div>

            {/* Fire Under Cauldron */}
            <div className={styles.fireContainer}>
                {Array.from({ length: heat }, (_, i) => (
                    <div
                        key={i}
                        className={styles.flame}
                        style={{
                            animationDelay: `${i * 0.1}s`,
                            left: `${15 + i * 15}%`,
                        }}
                    >
                        🔥
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MixingCauldron;
