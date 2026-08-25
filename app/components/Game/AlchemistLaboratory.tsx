"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { IngredientId, CauldronState, BrewedEffect } from '@/lib/schemas';
import { INGREDIENTS } from '@/lib/data';
import { brewPotion, isNewDiscovery } from '@/lib/potionLogic';
import { audioEngine } from '@/lib/audio/audioEngine';
import { tickLight } from './haptics';
import { MixingCauldron } from './MixingCauldron';
import { IngredientShelf } from './IngredientShelf';
import { AlchemyControls } from './AlchemyControls';
import { PotionPreview } from './PotionPreview';
import styles from './alchemistLaboratory.module.css';

interface AlchemistLaboratoryProps {
    onApplyEffect: (effect: BrewedEffect) => void;
    disabled?: boolean;
    /**
     * JUICE wiring: every lab control is a user gesture on the game surface,
     * so Game passes its music-unlock callback down (defensive, idempotent —
     * see Game.notifyUserGesture). Optional so the lab stays usable in
     * isolation/tests without Game.
     */
    onUserGesture?: () => void;
}

// Power is fixed now that the drag-slider is gone — keeps brewing gentle
// (never volatile) and one-tap simple for small kids.
const FIXED_INTENSITY = 1.0;

export function AlchemistLaboratory({
    onApplyEffect,
    disabled = false,
    onUserGesture,
}: AlchemistLaboratoryProps) {
    // Cauldron state
    const [ingredients, setIngredients] = useState<IngredientId[]>([]);
    const [heat, setHeat] = useState(1);

    // Discovery tracking
    const [discoveries, setDiscoveries] = useState<string[]>([]);

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
        intensity: FIXED_INTENSITY,
        brewTime: 0,
    }), [ingredients, heat]);

    const brewedEffect = useMemo(() => {
        if (ingredients.length === 0) return null;
        return brewPotion(cauldronState);
    }, [ingredients, cauldronState]);

    const isNew = useMemo(() => {
        if (!brewedEffect) return false;
        return isNewDiscovery(brewedEffect, discoveries);
    }, [brewedEffect, discoveries]);

    // Handlers — sounds play outside the state updaters so React StrictMode's
    // double-invoked updaters can't double-fire them; a full cauldron answers
    // with a friendly blip instead of silence (no dead ends). Every handler
    // also fires the standard LIGHT haptic tick (gated centrally in
    // haptics.ts) so lab mode is never a tactile dead zone next to classic
    // mode; handleApply deliberately doesn't tick here — Game's
    // handleApplyBrewedEffect already pairs light + celebration downstream.
    const handleIngredientAdd = useCallback((ingredientId: IngredientId) => {
        onUserGesture?.();
        tickLight();
        if (ingredients.length >= 5) {
            audioEngine.playPop();
            return;
        }
        audioEngine.playPop();
        setIngredients([...ingredients, ingredientId]);
    }, [ingredients, onUserGesture]);

    const handleIngredientRemove = useCallback((index: number) => {
        onUserGesture?.();
        tickLight();
        if (index < 0 || index >= ingredients.length) return;
        const next = [...ingredients];
        next.splice(index, 1);
        audioEngine.playPop();
        setIngredients(next);
    }, [ingredients, onUserGesture]);

    const handleHeatChange = useCallback((newHeat: number) => {
        onUserGesture?.();
        tickLight(); // the heat dial cycles levels by tap — a tick says "registered"
        setHeat(newHeat);
        audioEngine.playPop();
    }, [onUserGesture]);

    const handleApply = useCallback(() => {
        onUserGesture?.();
        if (!brewedEffect) return;

        // Track discovery
        if (isNew) {
            setDiscoveries(prev => [...prev, brewedEffect.primary]);
        }

        audioEngine.playRainbow();

        // Apply the effect
        onApplyEffect(brewedEffect);

        // Reset cauldron
        setIngredients([]);
    }, [brewedEffect, isNew, onApplyEffect, onUserGesture]);

    const handleClearCauldron = useCallback(() => {
        onUserGesture?.();
        tickLight();
        setIngredients([]);
        setHeat(1);
        audioEngine.playPop();
    }, [onUserGesture]);

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
            <IngredientShelf onAdd={handleIngredientAdd} disabled={disabled} />

            {/* Main Work Area */}
            <div className={styles.workArea}>
                {/* Controls (Left) */}
                <div className={styles.controlsSection}>
                    <AlchemyControls
                        heat={heat}
                        onHeatChange={handleHeatChange}
                        disabled={disabled || ingredients.length === 0}
                    />
                </div>

                {/* Cauldron (Center) */}
                <div className={styles.cauldronSection}>
                    <MixingCauldron
                        ingredients={ingredients}
                        heat={heat}
                        onIngredientDrop={handleIngredientAdd}
                        onIngredientRemove={handleIngredientRemove}
                        blendedColor={blendedColor}
                        isBrewing={false}
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
