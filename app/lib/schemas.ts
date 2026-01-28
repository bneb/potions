
import { z } from 'zod';

// --- Enums / Constants ---

export const AnimalIds = [
    'orangutan', 'trex', 'santa', 'crocodile', 'husky', 'scorpion'
] as const;

export const PotionTypes = [
    'growth', 'shrink', 'red', 'purple', 'rainbow', 'sunshine'
] as const;

export const TreatTypes = [
    'present', 'hotdog', 'banana', 'pizza', 'icecream', 'bone', 'bouquet', 'sunglasses'
] as const;

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

// --- Validation Functions (The Gates) ---

export function validateAnimalId(id: unknown): AnimalId {
    return AnimalIdSchema.parse(id);
}
