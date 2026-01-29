"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { IngredientId, CauldronState, BrewedEffect } from '@/lib/schemas';
import { INGREDIENTS } from '@/lib/data';
import { brewPotion, isNewDiscovery } from '@/lib/potionLogic';
import { audioEngine } from '@/lib/audio/audioEngine';
import { cn } from '@/lib/utils';
import { MixingCauldron } from './MixingCauldron';
import { IngredientShelf } from './IngredientShelf';
import { AlchemyControls } from './AlchemyControls';
import { PotionPreview } from './PotionPreview';
import styles from './alchemistLaboratory.module.css';

interface AlchemistLaboratoryProps {
    onApplyEffect: (effect: BrewedEffect) => void;
    disabled?: boolean;
}

export function AlchemistLaboratory({
    onApplyEffect,
    disabled = false,
}: AlchemistLaboratoryProps) {
    // Cauldron state
    const [ingredients, setIngredients] = useState<IngredientId[]>([]);
    const [heat, setHeat] = useState(1);
    const [intensity, setIntensity] = useState(0.5);
    const [brewTime, setBrewTime] = useState(0);
    const [isBrewing, setIsBrewing] = useState(false);

    // Discovery tracking
    const [discoveries, setDiscoveries] = useState<string[]>([]);

    // Brew timer ref
    const brewTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate blended color from ingredients
    const blendedColor = useMemo(() => {
        if (ingredients.length === 0) return '#6B5B95';

        const colors = ingredients.map(id => {
            const ingredient = INGREDIENTS.find(i => i.id === id);
            return ingredient?.color ?? '#888888';
        });

        // Blend colors (simple averaging)
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 128, g: 128, b: 128 };
        };

        const rgbToHex = (r: number, g: number, b: number) =>
            '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');

        const mixed = colors.reduce((acc, color) => {
            const rgb = hexToRgb(color);
            return { r: acc.r + rgb.r, g: acc.g + rgb.g, b: acc.b + rgb.b };
        }, { r: 0, g: 0, b: 0 });

        return rgbToHex(
            mixed.r / colors.length,
            mixed.g / colors.length,
            mixed.b / colors.length
        );
    }, [ingredients]);

    // Calculate the current brewed effect
    const cauldronState: CauldronState = useMemo(() => ({
        ingredients,
        heat,
        intensity,
        brewTime,
    }), [ingredients, heat, intensity, brewTime]);

    const brewedEffect = useMemo(() => {
        if (ingredients.length === 0) return null;
        return brewPotion(cauldronState);
    }, [ingredients, cauldronState]);

    const isNew = useMemo(() => {
        if (!brewedEffect) return false;
        return isNewDiscovery(brewedEffect, discoveries);
    }, [brewedEffect, discoveries]);

    // Handlers
    const handleIngredientDrop = useCallback((ingredientId: IngredientId) => {
        setIngredients(prev => {
            if (prev.length >= 5) return prev; // Max 5 ingredients
            audioEngine.playPop();
            return [...prev, ingredientId];
        });
    }, []);

    const handleIngredientRemove = useCallback((index: number) => {
        setIngredients(prev => {
            const next = [...prev];
            next.splice(index, 1);
            audioEngine.playPop();
            return next;
        });
    }, []);

    const handleHeatChange = useCallback((newHeat: number) => {
        setHeat(newHeat);
        audioEngine.playPop();
    }, []);

    const handleIntensityChange = useCallback((newIntensity: number) => {
        setIntensity(newIntensity);
    }, []);

    const handleStartBrew = useCallback(() => {
        if (ingredients.length === 0) {
            audioEngine.playError();
            return;
        }
        setIsBrewing(true);
        setBrewTime(0);
        audioEngine.playMagic();
    }, [ingredients.length]);

    const handleStopBrew = useCallback(() => {
        setIsBrewing(false);
        if (brewTimerRef.current) {
            clearInterval(brewTimerRef.current);
            brewTimerRef.current = null;
        }
    }, []);

    // Brew timer effect
    useEffect(() => {
        if (isBrewing) {
            brewTimerRef.current = setInterval(() => {
                setBrewTime(prev => {
                    if (prev >= 10) {
                        setIsBrewing(false);
                        return 10;
                    }
                    return prev + 0.1;
                });
            }, 100);

            return () => {
                if (brewTimerRef.current) {
                    clearInterval(brewTimerRef.current);
                }
            };
        }
    }, [isBrewing]);

    const handleApply = useCallback(() => {
        if (!brewedEffect) return;

        // Track discovery
        if (isNew) {
            setDiscoveries(prev => [...prev, brewedEffect.primary]);
        }

        // Play appropriate sound
        if (brewedEffect.isVolatile) {
            audioEngine.playError();
        } else {
            audioEngine.playRainbow();
        }

        // Apply the effect
        onApplyEffect(brewedEffect);

        // Reset cauldron
        setIngredients([]);
        setBrewTime(0);
        setIsBrewing(false);
    }, [brewedEffect, isNew, onApplyEffect]);

    const handleClearCauldron = useCallback(() => {
        setIngredients([]);
        setBrewTime(0);
        setHeat(1);
        setIntensity(0.5);
        audioEngine.playPop();
    }, []);

    return (
        <div className={styles.laboratory}>
            {/* Title */}
            <div className={styles.titleRow}>
                <h2 className={styles.title}>
                    <span>✨</span>
                    <span>Alchemy Lab</span>
                    <span>✨</span>
                </h2>
                {ingredients.length > 0 && (
                    <button
                        className={styles.clearButton}
                        onClick={handleClearCauldron}
                        title="Clear Cauldron"
                    >
                        🗑️ Clear
                    </button>
                )}
            </div>

            {/* Ingredient Shelf */}
            <IngredientShelf disabled={disabled} />

            {/* Main Work Area */}
            <div className={styles.workArea}>
                {/* Controls (Left) */}
                <div className={styles.controlsSection}>
                    <AlchemyControls
                        heat={heat}
                        intensity={intensity}
                        brewTime={brewTime}
                        isBrewing={isBrewing}
                        onHeatChange={handleHeatChange}
                        onIntensityChange={handleIntensityChange}
                        onStartBrew={handleStartBrew}
                        onStopBrew={handleStopBrew}
                        disabled={disabled || ingredients.length === 0}
                    />
                </div>

                {/* Cauldron (Center) */}
                <div className={styles.cauldronSection}>
                    <MixingCauldron
                        ingredients={ingredients}
                        heat={heat}
                        onIngredientDrop={handleIngredientDrop}
                        onIngredientRemove={handleIngredientRemove}
                        blendedColor={blendedColor}
                        isBrewing={isBrewing}
                    />
                </div>

                {/* Preview (Right) */}
                <div className={styles.previewSection}>
                    <PotionPreview
                        brewedEffect={brewedEffect}
                        blendedColor={blendedColor}
                        ingredientCount={ingredients.length}
                        isNewDiscovery={isNew}
                        onApply={handleApply}
                        disabled={disabled || !brewedEffect}
                    />
                </div>
            </div>

            {/* Discovery Counter */}
            <div className={styles.discoveryCounter}>
                <span className={styles.discoveryIcon}>📚</span>
                <span>Discoveries: {discoveries.length}</span>
            </div>
        </div>
    );
}

export default AlchemistLaboratory;
