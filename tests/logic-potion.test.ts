import { describe, it, expect } from 'vitest';
import {
    brewPotion,
    applyBrewedEffect,
    getRecipeName,
    isNewDiscovery,
    blendColors,
    type CharacterEffectState,
} from '@/lib/potionLogic';
import type { BrewedEffect, CauldronState, IngredientId } from '@/lib/schemas';
import { INGREDIENTS } from '@/lib/data';

/**
 * DELIVERABLE 2 — CHARACTERIZATION + TABLE-DRIVEN LOCK-DOWN of existing
 * potion logic. These tests pin CURRENT behavior exactly (any drift in
 * potionLogic.ts must fail them). Expected values are hand-derived from the
 * source / independent oracles (see mixHex below), never read back from the
 * functions under test.
 */

const byElement = {
    water: 'blue_root',
    air: 'sparkle_dust',
    fire: 'fire_bloom',
    earth: 'moon_moss',
    aether: 'rainbow_shard',
    void: 'shadow_berry',
} as const satisfies Record<string, IngredientId>;

const colorOf = (id: IngredientId): string =>
    INGREDIENTS.find(i => i.id === id)?.color ?? '#888888';

/** Independent re-implementation of the documented "average the RGB channels" rule. */
function mixHex(...hexes: string[]): string {
    const parse = (hex: string) => {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!m) return [128, 128, 128] as const;
        return [
            parseInt(m[1], 16),
            parseInt(m[2], 16),
            parseInt(m[3], 16),
        ] as const;
    };
    const chans = [0, 1, 2].map(i =>
        Math.round(hexes.map(parse).reduce((sum, rgb) => sum + rgb[i], 0) / hexes.length)
    );
    return '#' + chans.map(c => c.toString(16).padStart(2, '0')).join('');
}

const brew = (overrides: Partial<CauldronState>): BrewedEffect =>
    brewPotion({
        ingredients: [],
        heat: 1,
        intensity: 1,
        brewTime: 2,
        ...overrides,
    });

const asEffect = (primary: string, intensity: number, visualModifier?: string): BrewedEffect => ({
    primary,
    intensity,
    duration: 1,
    frequency: 1,
    isVolatile: false,
    color: '#888888',
    ...(visualModifier ? { visualModifier } : {}),
});

// ============================================================
// 1. ELEMENT SYNERGY MATRIX — every mapped pair, both orders
// ============================================================

describe('brewPotion: ELEMENT_SYNERGY matrix (every pair, both orders)', () => {
    // Hand-checked color spot values for two representative rows; the rest use
    // the independent mixHex oracle over the real ingredient colors.
    const HAND_CHECKED_COLORS: Partial<Record<string, string>> = {
        'water+air': '#a7cca3',
        'fire+void': '#ca7388',
    };

    const synergyPairs: Array<[string, string, string]> = [
        // [elementA, elementB, expected primary]
        ['water', 'air', 'levitation'],
        ['air', 'water', 'levitation'],
        ['water', 'fire', 'steam_shroud'],
        ['fire', 'water', 'steam_shroud'],
        ['water', 'earth', 'growth'],
        ['earth', 'water', 'growth'],
        ['fire', 'air', 'speed'],
        ['air', 'fire', 'speed'],
        ['fire', 'earth', 'strength'],
        ['earth', 'fire', 'strength'],
        ['earth', 'air', 'slow_fall'],
        ['air', 'earth', 'slow_fall'],
        ['water', 'void', 'invisibility'],
        ['void', 'water', 'invisibility'],
        ['fire', 'void', 'shrink'],
        ['void', 'fire', 'shrink'],
        ['air', 'aether', 'rainbow_trail'],
        ['aether', 'air', 'rainbow_trail'],
        ['earth', 'aether', 'sparkle_aura'],
        ['aether', 'earth', 'sparkle_aura'],
    ];

    it.each(synergyPairs)('%s + %s -> %s (low heat keeps the base effect)', (elemA, elemB, expected) => {
        const effect = brew({
            ingredients: [byElement[elemA as keyof typeof byElement], byElement[elemB as keyof typeof byElement]],
            heat: 1,
            intensity: 1,
        });
        expect(effect.primary).toBe(expected);
        expect(effect.isVolatile).toBe(false);

        // Color: exact average of the two ingredient colors, in insertion order.
        const key = `${elemA}+${elemB}`;
        const expectedColor =
            HAND_CHECKED_COLORS[key] ??
            mixHex(colorOf(byElement[elemA as keyof typeof byElement]), colorOf(byElement[elemB as keyof typeof byElement]));
        expect(effect.color.toLowerCase()).toBe(expectedColor.toLowerCase());
    });

    it.each([
        [['water', 'aether'], 'mystery'],
        [['aether', 'water'], 'mystery'],
        [['fire', 'aether'], 'mystery'],
        [['aether', 'fire'], 'mystery'],
        [['void', 'air'], 'mystery'],
        [['air', 'void'], 'mystery'],
        [['void', 'earth'], 'mystery'],
        [['earth', 'void'], 'mystery'],
        [['void', 'aether'], 'mystery'],
        [['aether', 'void'], 'mystery'],
    ] as const)('unmapped pair %s falls back to mystery (both orders)', (elems, expected) => {
        const effect = brew({
            ingredients: elems.map(e => byElement[e]),
            heat: 1,
            intensity: 1,
        });
        expect(effect.primary).toBe(expected);
    });
});

// ============================================================
// 2. SINGLE-ELEMENT EFFECTS — all six elements
// ============================================================

describe('brewPotion: single-element effects (all six elements)', () => {
    it.each([
        ['water', 'levitation'],
        ['air', 'slow_fall'],
        ['fire', 'speed'],
        ['earth', 'growth'],
        ['aether', 'rainbow_trail'],
        ['void', 'invisibility'],
    ] as const)('%s alone -> %s', (element, expected) => {
        const id = byElement[element];
        const effect = brew({ ingredients: [id], heat: 1, intensity: 1 });
        expect(effect.primary).toBe(expected);

        // n=1 scaling: intensity * (1*0.3 + 0.4) = 0.7
        expect(effect.intensity).toBeCloseTo(0.7, 10);
        expect(effect.isVolatile).toBe(false);
    });

    it('one fire ingredient can NEVER explode, even at maximum heat/intensity', () => {
        const effect = brew({
            ingredients: [byElement.fire],
            heat: 5,
            intensity: 2,
        });
        expect(effect.isVolatile).toBe(false);
        expect(effect.primary).toBe('teleport_flash'); // speed transformed by heat, not exploded
    });
});

// ============================================================
// 3. VOLATILE EXPLOSION — exact threshold boundaries on both sides
// ============================================================

describe('brewPotion: volatile explosion rule (fireCount>=2 && heat>=4 && intensity>1.5)', () => {
    const EXPLOSION = {
        primary: 'volatile_explosion',
        intensity: 2.0,
        duration: 0.5,
        frequency: 3,
        isVolatile: true,
        color: '#F44336',
    };

    it('exactly AT every threshold explodes (fireCount=2, heat=4, intensity just above 1.5)', () => {
        expect(brew({ ingredients: [byElement.fire, byElement.fire], heat: 4, intensity: 1.51 }))
            .toEqual(EXPLOSION);
        // clearly-above value explodes too
        expect(brew({ ingredients: [byElement.fire, byElement.fire], heat: 4, intensity: 1.6 })
            .primary).toBe('volatile_explosion');
    });

    it('intensity exactly 1.5 does NOT explode (strict >)', () => {
        const effect = brew({ ingredients: [byElement.fire, byElement.fire], heat: 4, intensity: 1.5 });
        expect(effect.isVolatile).toBe(false);
        // falls through to the normal pipeline: single element 'speed', heat-transformed
        expect(effect.primary).toBe('teleport_flash');
        expect(effect.intensity).toBeCloseTo(1.5, 10); // n=2 -> factor 1.0
    });

    it('heat exactly 3 does NOT explode even with huge intensity', () => {
        const effect = brew({ ingredients: [byElement.fire, byElement.fire], heat: 3, intensity: 2 });
        expect(effect.isVolatile).toBe(false);
        expect(effect.primary).toBe('speed'); // no heat transform below 4
    });

    it('a single fire ingredient does NOT explode regardless of heat/intensity', () => {
        const effect = brew({ ingredients: [byElement.fire, byElement.water], heat: 4, intensity: 2 });
        expect(effect.isVolatile).toBe(false);
        expect(effect.primary).toBe('cloud_form'); // steam_shroud transformed
    });

    it('three fires explode too (fireCount >= 2)', () => {
        const effect = brew({
            ingredients: [byElement.fire, byElement.fire, byElement.fire],
            heat: 5,
            intensity: 2,
        });
        expect(effect.isVolatile).toBe(true);
        expect(effect.primary).toBe('volatile_explosion');
    });

    it('explosion takes PRECEDENCE over synergy and heat transformations', () => {
        // Would otherwise be water+fire steam_shroud -> cloud_form.
        const effect = brew({
            ingredients: [byElement.fire, byElement.fire, byElement.water],
            heat: 4,
            intensity: 1.6,
        });
        expect(effect.primary).toBe('volatile_explosion');
    });
});

// ============================================================
// 4. HEAT TRANSFORMATIONS — on/off boundary (heat 4 vs 3)
// ============================================================

describe('brewPotion: heat transformations (boundary heat 3 vs 4)', () => {
    it.each([
        ['water', 'levitation', 'gravity_inversion'],
        ['air', 'slow_fall', 'float_forever'],
        ['fire', 'speed', 'teleport_flash'],
        ['earth', 'growth', 'giant'],
        ['aether', 'rainbow_trail', 'rainbow_trail'], // not transformable
        ['void', 'invisibility', 'invisibility'], // not transformable
    ] as const)(
        '%s alone: heat 3 keeps %s, heat 4 becomes %s',
        (element, base, transformed) => {
            const id = byElement[element];
            expect(brew({ ingredients: [id], heat: 3, intensity: 1 }).primary).toBe(base);
            expect(brew({ ingredients: [id], heat: 4, intensity: 1 }).primary).toBe(transformed);
        }
    );

    it('synergy effects transform at high heat too (water+air: levitation -> gravity_inversion)', () => {
        const low = brew({ ingredients: [byElement.water, byElement.air], heat: 3, intensity: 1 });
        const high = brew({ ingredients: [byElement.water, byElement.air], heat: 4, intensity: 1 });
        expect(low.primary).toBe('levitation');
        expect(high.primary).toBe('gravity_inversion');
        // duration formula check while we're here: brewTime * (heat*0.5)
        expect(low.duration).toBe(3); // 2 * (3*0.5) = 3
        expect(high.duration).toBe(4); // 2 * (4*0.5) = 4
    });

    it('mystery is never transformed', () => {
        const effect = brew({ ingredients: [byElement.water, byElement.aether], heat: 5, intensity: 1 });
        expect(effect.primary).toBe('mystery');
    });
});

// ============================================================
// 5. EMPTY CAULDRON + SCALAR FORMULAS (duration/frequency/intensity caps)
// ============================================================

describe('brewPotion: empty cauldron and scalar formulas', () => {
    it('empty cauldron brews a zero-intensity mystery', () => {
        expect(brewPotion({ ingredients: [], heat: 5, intensity: 2, brewTime: 10 })).toEqual({
            primary: 'mystery',
            intensity: 0,
            duration: 0,
            frequency: 0,
            isVolatile: false,
            color: '#888888',
        });
    });

    it.each([
        // brewTime, heat, void?, expected clamped duration
        [20, 2, false, 10], // 20 * 1 * 1 = 20 -> capped at 10
        [20, 1, false, 10], // 20 * 0.5 = 10 -> exactly the cap
        [8, 2, true, 4], // 8 * 0.5(void) * 1 = 4
        [0, 1, false, 1], // floored at 1
        [6, 2, false, 6], // passthrough: 6 * 1 * 1
    ] as const)('duration: brewTime=%i heat=%i void=%j -> %i', (brewTime, heat, hasVoid, expected) => {
        const ingredients = hasVoid
            ? [byElement.void, byElement.void]
            : [byElement.earth, byElement.earth];
        expect(brew({ ingredients, heat, intensity: 1, brewTime }).duration).toBe(expected);
    });

    it.each([
        [1, false, 1],
        [3, false, 1],
        [4, false, 2],
        [5, false, 2],
        [1, true, 3],
        [5, true, 3],
    ] as const)('frequency: heat=%i aether=%j -> %i', (heat, hasAether, expected) => {
        const ingredients = hasAether ? [byElement.aether] : [byElement.water];
        expect(brew({ ingredients, heat, intensity: 1 }).frequency).toBe(expected);
    });

    it('intensity multiplier saturates at the 2.0 cap', () => {
        // 6 ingredients -> factor 6*0.3+0.4 = 2.2, input 1 -> min(2, 2.2) = 2
        const all = Object.values(byElement) as IngredientId[];
        const effect = brew({ ingredients: [...all], heat: 1, intensity: 1 });
        expect(effect.intensity).toBe(2);
        expect(effect.visualModifier).toBe('rainbow-shimmer'); // aether present
        expect(effect.frequency).toBe(3);
    });

    it('n=2 keeps raw intensity (factor 1.0) — used by the volatile boundary tests', () => {
        expect(brew({ ingredients: [byElement.water, byElement.air], heat: 1, intensity: 1.23 }).intensity)
            .toBeCloseTo(1.23, 10);
    });
});

// ============================================================
// 6. blendCOLORS — direct unit table (averaging, case-insensitivity)
// ============================================================

describe('blendColors: averaging, case-insensitivity, degenerate inputs', () => {
    it('empty list -> placeholder gray', () => {
        expect(blendColors([])).toBe('#888888');
    });

    it('single color passes through unchanged', () => {
        expect(blendColors(['#FF0000'])).toBe('#FF0000');
        expect(blendColors(['#4fc3f7'])).toBe('#4fc3f7');
    });

    it('two colors average per channel (round-half-up)', () => {
        expect(blendColors(['#FF0000', '#00FF00'])).toBe('#808000'); // 127.5 -> 128
        expect(blendColors(['#FFFFFF', '#000000'])).toBe('#808080');
    });

    it('is case-insensitive on hex digits AND the # prefix forms', () => {
        expect(blendColors(['#ff0000', '#00ff00'])).toBe(blendColors(['#FF0000', '#00FF00']));
        expect(blendColors(['#a7CcA3', '#A7CCA3'])).toBe('#a7cca3');
    });

    it('handles more than two colors by averaging all of them equally', () => {
        expect(blendColors(['#FF0000', '#00FF00', '#0000FF'])).toBe('#555555'); // 255/3 = 85 = 0x55
        expect(blendColors(['#FFFFFF', '#FFFFFF', '#000000'])).toBe('#aaaaaa'); // 510/3 = 170
    });

    it('unparseable colors fall back to mid-gray per channel', () => {
        // (#zzzzzz -> 128,128,128) mixed with pure red
        expect(blendColors(['#zzzzzz', '#FF0000'])).toBe('#c04040');
    });

    it('matches the independent mixing oracle across all ingredient colors', () => {
        const colors = INGREDIENTS.map(i => i.color);
        for (let i = 0; i < colors.length; i++) {
            for (let j = 0; j < colors.length; j++) {
                expect(blendColors([colors[i], colors[j]])).toBe(
                    mixHex(colors[i], colors[j])
                );
            }
        }
    });
});

// ============================================================
// 7. applyBrewedEffect — clamps, overflow bounds, class assembly
// ============================================================

describe('applyBrewedEffect: scale clamp 0.3..2.0', () => {
    it.each([
        ['growth', 10, 2.0], // raw 1 + 3 = 4 -> ceiling
        ['giant', 10, 2.0], // same grow branch
        ['growth', 2, 1.6], // raw 1 + 0.6, no clamp needed
        ['shrink', 10, 0.3], // raw 1 - 3 = -2 -> floor
        ['shrink', 2, 0.4], // raw 0.4, no clamp needed
    ] as const)('%s @ intensity %i -> scale %s (clamped where needed)', (primary, intensity, expected) => {
        expect(applyBrewedEffect(asEffect(primary, intensity)).scale).toBe(expected);
    });

    it.each([
        ['levitation', 2],
        ['invisibility', 2],
        ['mystery', 2],
        ['sparkle_aura', 2],
    ] as const)('%s ignores intensity and keeps scale exactly 1', (primary, intensity) => {
        expect(applyBrewedEffect(asEffect(primary, intensity)).scale).toBe(1);
    });
});

describe('applyBrewedEffect: overflowLevel bounds 0..100 and shake class', () => {
    it.each([
        [0, 0], // negative raw value floors at 0
        [0.5, 0],
        [1, 0],
        [1.5, 50], // exactly at the shake threshold...
        [1.51, 51], // ...just above it
        [2, 100],
        [3, 100], // ceilings at 100
    ] as const)('tolerance 1, intensity %s -> overflowLevel %i', (intensity, expected) => {
        expect(applyBrewedEffect(asEffect('levitation', intensity)).overflowLevel).toBe(expected);
    });

    it("adds 'overflow-shake' ONLY strictly above overflowLevel 50", () => {
        const atThreshold = applyBrewedEffect(asEffect('levitation', 1.5));
        const aboveThreshold = applyBrewedEffect(asEffect('levitation', 1.51));
        expect(atThreshold.classes).not.toContain('overflow-shake');
        expect(aboveThreshold.classes).toContain('overflow-shake');
    });

    it('respects a custom tolerance', () => {
        const state: CharacterEffectState = applyBrewedEffect(asEffect('levitation', 3), 2);
        expect(state.overflowLevel).toBe(50); // ((3-2)/2)*100
        expect(state.classes).not.toContain('overflow-shake');
        expect(applyBrewedEffect(asEffect('levitation', 4), 2).overflowLevel).toBe(100);
    });
});

describe('applyBrewedEffect: filter and classes from EFFECT_VISUALS', () => {
    it.each([
        ['cloud_form', 'blur(4px) opacity(0.6)'],
        ['steam_shroud', 'blur(2px) opacity(0.8)'],
        ['invisibility', 'opacity(0.3)'],
        ['levitation', ''],
    ] as const)('%s carries its configured filter verbatim (%j)', (primary, filter) => {
        expect(applyBrewedEffect(asEffect(primary, 1)).filter).toBe(filter);
    });

    it('builds animate-* classes plus optional visualModifier', () => {
        const state = applyBrewedEffect(asEffect('rainbow_trail', 0.2, 'rainbow-shimmer'));
        expect(state.classes).toEqual(['animate-rainbow-cycle', 'rainbow-shimmer']);
    });

    it('unknown primaries fall back to the mystery visual (animate-shimmer)', () => {
        const state = applyBrewedEffect(asEffect('definitely_not_real', 1));
        expect(state.filter).toBe('');
        expect(state.classes).toEqual(['animate-shimmer']);
        expect(state.scale).toBe(1);
    });
});

// ============================================================
// 8. RECIPE NAMES + DISCOVERY
// ============================================================

describe('getRecipeName: title-casing and fallback', () => {
    it.each([
        ['steam_shroud', '💨 Steam Shroud'],
        ['gravity_inversion', '🙃 Gravity Inversion'],
        ['volatile_explosion', '💥 Volatile Explosion'],
        ['mystery', '❓ Mystery'],
        ['sparkle_aura', '✨ Sparkle Aura'],
    ] as const)('%s -> %j', (primary, expected) => {
        expect(getRecipeName(asEffect(primary, 1))).toBe(expected);
    });

    it('primaries missing from EFFECT_VISUALS fall back to Mystery Brew', () => {
        expect(getRecipeName(asEffect('unknown_effect', 1))).toBe('❓ Mystery Brew');
    });
});

describe('isNewDiscovery', () => {
    it('is true when the primary was never seen', () => {
        expect(isNewDiscovery(asEffect('giant', 2), ['growth', 'shrink'])).toBe(true);
    });

    it('is false when the primary was already discovered', () => {
        expect(isNewDiscovery(asEffect('giant', 2), ['growth', 'giant'])).toBe(false);
    });

    it('an empty discovery log makes everything new', () => {
        expect(isNewDiscovery(asEffect('mystery', 0), [])).toBe(true);
    });
});
