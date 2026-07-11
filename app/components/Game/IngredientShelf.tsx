"use client";

import React, { useCallback } from 'react';
import { IngredientId } from '@/lib/schemas';
import { INGREDIENTS } from '@/lib/data';
import { cn } from '@/lib/utils';
import styles from './ingredientShelf.module.css';

interface IngredientShelfProps {
    onAdd: (ingredientId: IngredientId) => void;
    disabled?: boolean;
}

export function IngredientShelf({ onAdd, disabled = false }: IngredientShelfProps) {
    const handleDragStart = useCallback((e: React.DragEvent, ingredientId: IngredientId) => {
        e.dataTransfer.setData('ingredient', ingredientId);
        e.dataTransfer.effectAllowed = 'copy';

        // Add dragging class to element
        const target = e.currentTarget as HTMLElement;
        target.classList.add(styles.dragging);
    }, []);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.classList.remove(styles.dragging);
    }, []);

    return (
        <div className={styles.shelf}>
            <h3 className={styles.title}>
                <span>🌿</span>
                <span>Ingredients</span>
                <span>🌿</span>
            </h3>
            <div className={styles.ingredientGrid}>
                {INGREDIENTS.map((ingredient) => (
                    <div
                        key={ingredient.id}
                        className={cn(
                            styles.ingredientItem,
                            disabled && styles.disabled
                        )}
                        onClick={() => !disabled && onAdd(ingredient.id)}
                        draggable={!disabled}
                        onDragStart={(e) => handleDragStart(e, ingredient.id)}
                        onDragEnd={handleDragEnd}
                        title={ingredient.name}
                        role="button"
                        tabIndex={disabled ? -1 : 0}
                        onKeyDown={(e) => {
                            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                onAdd(ingredient.id);
                            }
                        }}
                        aria-label={`Add ${ingredient.name} to cauldron`}
                    >
                        {/* Ingredient Bottle */}
                        <div
                            className={styles.bottle}
                            style={{ '--ingredient-color': ingredient.color } as React.CSSProperties}
                        >
                            {/* Bottle Body */}
                            <div className={styles.bottleBody}>
                                <div className={styles.liquidFill} />
                                <div className={styles.glassShine} />
                            </div>
                            {/* Bottle Neck */}
                            <div className={styles.bottleNeck} />
                            {/* Cork */}
                            <div className={styles.cork} />
                        </div>

                        {/* Emoji Label */}
                        <span className={styles.emoji}>{ingredient.emoji}</span>

                        {/* Name Label */}
                        <span className={styles.name}>{ingredient.name.split(' ')[0]}</span>

                        {/* Element Badge */}
                        <span
                            className={styles.elementBadge}
                            style={{
                                backgroundColor: ingredient.color,
                            }}
                        >
                            {ingredient.element.charAt(0).toUpperCase()}
                        </span>

                        {/* Sparkle Trail (shows during drag) */}
                        <div className={styles.sparkleTrail}>
                            <span>✨</span>
                            <span>✨</span>
                            <span>✨</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Instruction */}
            <p className={styles.instruction}>
                👆 Tap an ingredient to add it! 👆
            </p>
        </div>
    );
}

export default IngredientShelf;
