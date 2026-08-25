
import { z } from 'zod';

// --- Enums / Constants ---

export const AnimalIds = [
    'orangutan', 'trex', 'santa', 'crocodile', 'husky', 'scorpion', 'elephant', 'dragon'
] as const;

export const PotionTypes = [
    'growth', 'shrink', 'red', 'purple', 'rainbow', 'sunshine'
] as const;

export const TreatTypes = [
    'present', 'hotdog', 'banana', 'pizza', 'icecream', 'bone', 'bouquet', 'sunglasses'
] as const;

// === ALCHEMY SYSTEM ===

export const IngredientIds = [
    'blue_root',      // Element: Water    | Primary: Gravity
    'sparkle_dust',   // Element: Air      | Primary: Time
    'fire_bloom',     // Element: Fire     | Primary: Intensity  
    'moon_moss',      // Element: Earth    | Primary: Duration
    'rainbow_shard',  // Element: Aether   | Primary: Modifier
    'shadow_berry',   // Element: Void     | Primary: Inversion
] as const;

export const Elements = ['water', 'air', 'fire', 'earth', 'aether', 'void'] as const;
export const EffectAxes = ['intensity', 'duration', 'frequency'] as const;

// --- Schemas ---

export const AnimalIdSchema = z.enum(AnimalIds);
export type AnimalId = z.infer<typeof AnimalIdSchema>;

export const PotionTypeSchema = z.enum(PotionTypes);
export type PotionType = z.infer<typeof PotionTypeSchema>;

export const TreatTypeSchema = z.enum(TreatTypes);
export type TreatType = z.infer<typeof TreatTypeSchema>;

// === ANIMAL VOICES (delight feature — ADDITIVE, nothing above changed) ===
//
// A `voice` is a tiny synth recipe a pre-reader can tell species apart by:
// one short glide per segment (freqStart → freqEnd), repeated `repeats`
// times with `gapMs` between segments. Safety rails are baked into the
// schema because these sounds play right next to toddler ears:
// - durationMs ≤ 350 per segment (short by construction)
// - peakGain ≤ 0.25 (gentle; no harsh blasts)
// - frequencies ≤ 2000 Hz (no piercing highs)
export const VoiceWaves = ['sine', 'triangle', 'square', 'sawtooth'] as const;

export const AnimalVoicePresetNames = [
    'woof',     // husky  — double triangle bark
    'roar',     // trex   — one long dramatic falling sawtooth roar
    'jingle',   // santa  — three bright sleigh-bell dings
    'snap',     // crocodile — three dry square clicks (jaw snap)
    'skitter',  // scorpion  — four tiny fast ticks
    'trumpet',  // elephant  — classic rising sawtooth trumpet
    'hoot',     // orangutan — soft falling sine "hoo-hoo"
    'growl',    // dragon — low rumbling double pulse
] as const;

export const VoiceWaveSchema = z.enum(VoiceWaves);
export type VoiceWave = z.infer<typeof VoiceWaveSchema>;

export const AnimalVoicePresetSchema = z.enum(AnimalVoicePresetNames);
export type AnimalVoicePreset = z.infer<typeof AnimalVoicePresetSchema>;

export const AnimalVoiceSchema = z.object({
    preset: AnimalVoicePresetSchema,
    wave: VoiceWaveSchema,
    freqStart: z.number().min(30).max(2000),
    freqEnd: z.number().min(30).max(2000),
    durationMs: z.number().int().min(40).max(350),
    peakGain: z.number().min(0.01).max(0.25),
    repeats: z.number().int().min(1).max(4).optional(),
    gapMs: z.number().int().min(0).max(400).optional(),
})
    // Aggregate safety rail: the WHOLE call stays ≤1.2 s (per-field limits
    // alone would legally allow ~2.6 s of scheduled sound).
    .refine(
        v => (v.repeats ?? 1) * v.durationMs + ((v.repeats ?? 1) - 1) * (v.gapMs ?? 0) <= 1200,
        { message: 'voice call must stay within 1.2 s total' },
    )
    // Adjacent segments need a release gap: each segment's gain tail rings
    // ~20 ms past its nominal end, so a smaller gap smears segments together.
    .refine(
        v => (v.repeats ?? 1) <= 1 || (v.gapMs ?? 0) >= 25,
        { message: 'repeated segments need ≥25 ms between them' },
    );
export type AnimalVoice = z.infer<typeof AnimalVoiceSchema>;

export const AnimalSchema = z.object({
    id: AnimalIdSchema,
    name: z.string().min(1, "Animal name is required"),
    imageSrc: z.string().url().or(z.string().startsWith('/')), // Allow local relative paths
    audioFrequency: z.array(z.number()).optional(), // For custom sounds if we get fancy
    voice: AnimalVoiceSchema.optional(), // Per-animal synth cry (delight feature; optional keeps old data valid)
});
export type Animal = z.infer<typeof AnimalSchema>;

export const PotionSchema = z.object({
    id: PotionTypeSchema,
    name: z.string(),
    imageSrc: z.string(),
    color: z.string().optional(), // For particle effects
});
export type Potion = z.infer<typeof PotionSchema>;

export const TreatSchema = z.object({
    id: TreatTypeSchema,
    name: z.string(),
    emoji: z.string().optional(), // Treats are mostly emojis
    imageSrc: z.string().optional(),
});
export type Treat = z.infer<typeof TreatSchema>;

// === ALCHEMY SYSTEM SCHEMAS ===

export const IngredientIdSchema = z.enum(IngredientIds);
export type IngredientId = z.infer<typeof IngredientIdSchema>;

export const ElementSchema = z.enum(Elements);
export type Element = z.infer<typeof ElementSchema>;

export const EffectAxisSchema = z.enum(EffectAxes);
export type EffectAxis = z.infer<typeof EffectAxisSchema>;

export const IngredientSchema = z.object({
    id: IngredientIdSchema,
    name: z.string(),
    element: ElementSchema,
    color: z.string(),
    primaryEffect: EffectAxisSchema,
    emoji: z.string(),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

// Cauldron state during brewing
export const CauldronStateSchema = z.object({
    ingredients: z.array(IngredientIdSchema),
    heat: z.number().min(1).max(5),
    intensity: z.number().min(0).max(2),
    brewTime: z.number().min(0),
});
export type CauldronState = z.infer<typeof CauldronStateSchema>;

// Result of brewing a potion
export const BrewedEffectSchema = z.object({
    primary: z.string(),
    intensity: z.number(),
    duration: z.number(),
    frequency: z.number(),
    isVolatile: z.boolean(),
    color: z.string(),
    visualModifier: z.string().optional(),
});
export type BrewedEffect = z.infer<typeof BrewedEffectSchema>;

// --- Validation Functions (The Gates) ---

export function validateAnimalId(id: unknown): AnimalId {
    return AnimalIdSchema.parse(id);
}

