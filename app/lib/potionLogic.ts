"use client";

import { IngredientId, CauldronState, BrewedEffect, Element } from './schemas';
import { INGREDIENTS } from './data';

// === ELEMENT SYNERGY MATRIX ===
// Defines what effect emerges from combining two elements

type ElementPair = `${Element}+${Element}`;

const ELEMENT_SYNERGY: Partial<Record<ElementPair, string>> = {
    'water+air': 'levitation',
    'air+water': 'levitation',
    'water+fire': 'steam_shroud',
    'fire+water': 'steam_shroud',
    'water+earth': 'growth',
    'earth+water': 'growth',
    'fire+air': 'speed',
    'air+fire': 'speed',
    'fire+earth': 'strength',
    'earth+fire': 'strength',
    'earth+air': 'slow_fall',
    'air+earth': 'slow_fall',
    'water+void': 'invisibility',
    'void+water': 'invisibility',
    'fire+void': 'shrink',
    'void+fire': 'shrink',
    'air+aether': 'rainbow_trail',
    'aether+air': 'rainbow_trail',
    'earth+aether': 'sparkle_aura',
    'aether+earth': 'sparkle_aura',
};

// High heat transforms certain effects
const HEAT_TRANSFORMATIONS: Record<string, string> = {
    'levitation': 'gravity_inversion',
    'steam_shroud': 'cloud_form',
    'growth': 'giant',
    'speed': 'teleport_flash',
    'strength': 'earthquake_stomp',
    'slow_fall': 'float_forever',
};

// Effect visual configurations (for character animations)
export const EFFECT_VISUALS: Record<string, {
    color: string;
    filter?: string;
    animation?: string;
    emoji: string;
}> = {
    'levitation': { color: '#4FC3F7', animation: 'float', emoji: '🎈' },
    'gravity_inversion': { color: '#7C4DFF', animation: 'flip-float', emoji: '🙃' },
    'steam_shroud': { color: '#B0BEC5', filter: 'blur(2px) opacity(0.8)', emoji: '💨' },
    'cloud_form': { color: '#ECEFF1', filter: 'blur(4px) opacity(0.6)', emoji: '☁️' },
    'growth': { color: '#81C784', animation: 'pulse-grow', emoji: '🌱' },
    'giant': { color: '#4CAF50', animation: 'grow-large', emoji: '🦖' },
    'speed': { color: '#FF7043', animation: 'vibrate', emoji: '⚡' },
    'teleport_flash': { color: '#FFEB3B', animation: 'flash-teleport', emoji: '✨' },
    'strength': { color: '#8D6E63', animation: 'flex', emoji: '💪' },
    'earthquake_stomp': { color: '#795548', animation: 'stomp-shake', emoji: '🌋' },
    'slow_fall': { color: '#A5D6A7', animation: 'gentle-fall', emoji: '🍃' },
    'float_forever': { color: '#C8E6C9', animation: 'eternal-float', emoji: '🎐' },
    'invisibility': { color: '#9575CD', filter: 'opacity(0.3)', emoji: '👻' },
    'shrink': { color: '#FF5722', animation: 'shrink-bounce', emoji: '🐜' },
    'rainbow_trail': { color: '#E040FB', animation: 'rainbow-cycle', emoji: '🌈' },
    'sparkle_aura': { color: '#FFD54F', animation: 'sparkle', emoji: '✨' },
    'volatile_explosion': { color: '#F44336', animation: 'explode', emoji: '💥' },
    'mystery': { color: '#9E9E9E', animation: 'shimmer', emoji: '❓' },
};

// === CORE BREWING FUNCTION ===

function getIngredientElement(id: IngredientId): Element {
    const ingredient = INGREDIENTS.find(i => i.id === id);
    return ingredient?.element ?? 'earth';
}

function getIngredientColor(id: IngredientId): string {
    const ingredient = INGREDIENTS.find(i => i.id === id);
    return ingredient?.color ?? '#888888';
}

// Exported (additive) for table-driven unit testing and headless reuse;
// behavior is unchanged — see tests/logic-potion.test.ts.
export function blendColors(colors: string[]): string {
    if (colors.length === 0) return '#888888';
    if (colors.length === 1) return colors[0];

    // Simple color blending - take first two and mix
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
}

export function brewPotion(state: CauldronState): BrewedEffect {
    const { ingredients, heat, intensity, brewTime } = state;

    // Empty cauldron = no effect
    if (ingredients.length === 0) {
        return {
            primary: 'mystery',
            intensity: 0,
            duration: 0,
            frequency: 0,
            isVolatile: false,
            color: '#888888',
        };
    }

    // Get elements from ingredients
    const elements = ingredients.map(getIngredientElement);
    const uniqueElements = [...new Set(elements)];
    const colors = ingredients.map(getIngredientColor);
    const blendedColor = blendColors(colors);

    // Check for volatile combination (too many fire elements + high heat)
    const fireCount = elements.filter(e => e === 'fire').length;
    const isVolatile = fireCount >= 2 && heat >= 4 && intensity > 1.5;

    if (isVolatile) {
        return {
            primary: 'volatile_explosion',
            intensity: 2.0,
            duration: 0.5,
            frequency: 3,
            isVolatile: true,
            color: '#F44336',
        };
    }

    // Determine base effect from element combination
    let baseEffect = 'mystery';

    if (uniqueElements.length >= 2) {
        // Look for synergy between first two unique elements
        const pairKey = `${uniqueElements[0]}+${uniqueElements[1]}` as ElementPair;
        baseEffect = ELEMENT_SYNERGY[pairKey] ?? 'mystery';
    } else if (uniqueElements.length === 1) {
        // Single element effects
        const singleEffects: Record<Element, string> = {
            'water': 'levitation',
            'air': 'slow_fall',
            'fire': 'speed',
            'earth': 'growth',
            'aether': 'rainbow_trail',
            'void': 'invisibility',
        };
        baseEffect = singleEffects[uniqueElements[0]] ?? 'mystery';
    }

    // High heat can transform effects
    if (heat >= 4 && HEAT_TRANSFORMATIONS[baseEffect]) {
        baseEffect = HEAT_TRANSFORMATIONS[baseEffect];
    }

    // Special: Aether makes everything rainbow-tinted
    const hasAether = uniqueElements.includes('aether');
    const visualModifier = hasAether ? 'rainbow-shimmer' : undefined;

    // Special: Void inverts the effect direction
    const hasVoid = uniqueElements.includes('void');

    // Calculate final parameters
    const finalIntensity = Math.min(2.0, intensity * (ingredients.length * 0.3 + 0.4));
    const finalDuration = brewTime * (hasVoid ? 0.5 : 1.0) * (heat * 0.5);
    const finalFrequency = hasAether ? 3 : (heat > 3 ? 2 : 1);

    return {
        primary: baseEffect,
        intensity: finalIntensity,
        duration: Math.max(1, Math.min(10, finalDuration)),
        frequency: finalFrequency,
        isVolatile: false,
        color: blendedColor,
        visualModifier,
    };
}

// === EFFECT APPLICATION ===

export interface CharacterEffectState {
    scale: number;
    filter: string;
    classes: string[];
    overflowLevel: number; // 0-100
}

export function applyBrewedEffect(
    effect: BrewedEffect,
    currentTolerance: number = 1.0
): CharacterEffectState {
    const visual = EFFECT_VISUALS[effect.primary] ?? EFFECT_VISUALS['mystery'];

    // Calculate if overflowing
    const overflowLevel = Math.min(100, Math.max(0,
        ((effect.intensity - currentTolerance) / currentTolerance) * 100
    ));

    // Determine scale based on effect
    let scale = 1.0;
    if (effect.primary === 'growth' || effect.primary === 'giant') {
        scale = 1 + (effect.intensity * 0.3);
    } else if (effect.primary === 'shrink') {
        scale = 1 - (effect.intensity * 0.3);
    }

    // Build CSS classes
    const classes: string[] = [];
    if (visual.animation) {
        classes.push(`animate-${visual.animation}`);
    }
    if (effect.visualModifier) {
        classes.push(effect.visualModifier);
    }
    if (overflowLevel > 50) {
        classes.push('overflow-shake');
    }

    return {
        scale: Math.max(0.3, Math.min(2.0, scale)),
        filter: visual.filter ?? '',
        classes,
        overflowLevel,
    };
}

// === RECIPE DISCOVERY ===

export interface RecipeRecord {
    ingredients: IngredientId[];
    heat: number;
    effectName: string;
    emoji: string;
    discoveredAt: number;
}

export function getRecipeName(effect: BrewedEffect): string {
    const visual = EFFECT_VISUALS[effect.primary];
    return visual ? `${visual.emoji} ${effect.primary.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}` : '❓ Mystery Brew';
}

export function isNewDiscovery(
    effect: BrewedEffect,
    previousDiscoveries: string[]
): boolean {
    return !previousDiscoveries.includes(effect.primary);
}

// Additive re-export (type-only, zero runtime change): benchmarks and
// consumers of brewPotion/applyBrewedEffect need BrewedEffect from here.
export type { BrewedEffect };
