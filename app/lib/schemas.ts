
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

export const AnimalSchema = z.object({
    id: AnimalIdSchema,
    name: z.string().min(1, "Animal name is required"),
    imageSrc: z.string().url().or(z.string().startsWith('/')), // Allow local relative paths
    audioFrequency: z.array(z.number()).optional(), // For custom sounds if we get fancy
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

