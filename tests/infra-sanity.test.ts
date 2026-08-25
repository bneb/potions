import { describe, it, expect } from 'vitest';
import { ANIMALS, POTIONS, TREATS, INGREDIENTS } from '@/lib/data';
import { AnimalSchema, PotionSchema, TreatSchema, IngredientSchema } from '@/lib/schemas';

// Sanity gate: the shared Vitest harness resolves the '@' alias and the
// game's static data always satisfies its zod schemas. If this file fails,
// no other test in this repo can be trusted.
describe('infra sanity: data integrity', () => {
    it('every animal satisfies the Animal schema', () => {
        expect(ANIMALS.length).toBeGreaterThanOrEqual(8);
        for (const animal of ANIMALS) {
            expect(() => AnimalSchema.parse(animal)).not.toThrow();
        }
    });

    it('every potion satisfies the Potion schema', () => {
        for (const potion of POTIONS) {
            expect(() => PotionSchema.parse(potion)).not.toThrow();
        }
    });

    it('every treat satisfies the Treat schema', () => {
        for (const treat of TREATS) {
            expect(() => TreatSchema.parse(treat)).not.toThrow();
        }
    });

    it('every ingredient satisfies the Ingredient schema', () => {
        for (const ingredient of INGREDIENTS) {
            expect(() => IngredientSchema.parse(ingredient)).not.toThrow();
        }
    });
});
