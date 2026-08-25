
import { Animal, Potion, Treat, Ingredient } from './schemas';

// --- Assets are in /public/assets, so we reference them as /assets/... ---
//
// Voice design notes (delight feature): each species gets a SHORT (≤350 ms
// per segment), GENTLE (peak ≤0.25) synth cry a 3-year-old can tell apart
// by ear — distinct timbre (wave), rhythm (repeats/gap), register
// (frequency band) or glide direction. See tests/audio-animals.test.ts.

export const ANIMALS: Animal[] = [
    {
        id: 'orangutan', name: 'Orangutan', imageSrc: '/assets/monkey.png', // Placeholder image, component rendered
        voice: { preset: 'hoot', wave: 'sine', freqStart: 380, freqEnd: 210, durationMs: 240, peakGain: 0.2, repeats: 2, gapMs: 140 },
    },
    {
        id: 'trex', name: 'T-Rex', imageSrc: '/assets/trex.png',
        // Sawtooth keeps harmonic buzz audible down to ~70 Hz on tablet
        // speakers; below that the roar simply vanishes for the kid.
        voice: { preset: 'roar', wave: 'sawtooth', freqStart: 220, freqEnd: 70, durationMs: 340, peakGain: 0.24 },
    },
    {
        id: 'santa', name: 'Santa Claus', imageSrc: '/assets/santa.png',
        voice: { preset: 'jingle', wave: 'triangle', freqStart: 1568, freqEnd: 1046, durationMs: 120, peakGain: 0.16, repeats: 3, gapMs: 110 },
    },
    {
        id: 'crocodile', name: 'Crocodile', imageSrc: '/assets/crocodile.png',
        voice: { preset: 'snap', wave: 'square', freqStart: 190, freqEnd: 70, durationMs: 70, peakGain: 0.14, repeats: 3, gapMs: 95 },
    },
    {
        id: 'husky', name: 'Husky', imageSrc: '/assets/husky.png',
        voice: { preset: 'woof', wave: 'triangle', freqStart: 340, freqEnd: 130, durationMs: 150, peakGain: 0.22, repeats: 2, gapMs: 120 },
    },
    {
        id: 'scorpion', name: 'Scorpion', imageSrc: '/assets/scorpion.png',
        voice: { preset: 'skitter', wave: 'triangle', freqStart: 1150, freqEnd: 700, durationMs: 45, peakGain: 0.1, repeats: 4, gapMs: 55 },
    },
    {
        id: 'elephant', name: 'Elephant', imageSrc: '/assets/elephant.png',
        voice: { preset: 'trumpet', wave: 'sawtooth', freqStart: 240, freqEnd: 520, durationMs: 260, peakGain: 0.2 },
    },
    {
        id: 'dragon', name: 'Dragon', imageSrc: '/assets/dragon.png',
        // Triangle waves are nearly pure — below ~110 Hz they vanish on
        // tablet speakers. Kept at 220→115 Hz and made TRIPLE-rhythm so it
        // separates from Husky's double woof structurally, not just by pitch.
        voice: { preset: 'growl', wave: 'triangle', freqStart: 220, freqEnd: 115, durationMs: 170, peakGain: 0.22, repeats: 3, gapMs: 95 },
    },
];

export const POTIONS: Potion[] = [
    { id: 'growth', name: 'Growth Potion', imageSrc: '/assets/potion-growth.png', color: '#4caf50' },
    { id: 'shrink', name: 'Shrink Potion', imageSrc: '/assets/potion-shrink.png', color: '#f44336' },
    { id: 'red', name: 'Red Potion', imageSrc: '/assets/potion-red.png', color: '#e91e63' },
    { id: 'purple', name: 'Purple Potion', imageSrc: '/assets/potion-purple.png', color: '#9c27b0' },
    { id: 'rainbow', name: 'Rainbow Potion', imageSrc: '/assets/potion-rainbow.png' },
    { id: 'sunshine', name: 'Sunshine Potion', imageSrc: '/assets/potion-sunshine.png' },
];

export const TREATS: Treat[] = [
    { id: 'present', name: 'Gift', emoji: '🎁' },
    { id: 'hotdog', name: 'Hotdog', emoji: '🌭' },
    { id: 'banana', name: 'Banana', emoji: '🍌' },
    { id: 'pizza', name: 'Pizza', emoji: '🍕' },
    { id: 'icecream', name: 'Ice Cream', emoji: '🍦' },
    { id: 'bone', name: 'Bone', emoji: '🦴' },
    { id: 'bouquet', name: 'Bouquet', emoji: '💐' },
    { id: 'sunglasses', name: 'Sunglasses', emoji: '🕶️' },
];

// === ALCHEMY INGREDIENTS ===

export const INGREDIENTS: Ingredient[] = [
    {
        id: 'blue_root',
        name: 'Blue Root',
        element: 'water',
        color: '#4FC3F7',
        primaryEffect: 'intensity',
        emoji: '🫚'
    },
    {
        id: 'sparkle_dust',
        name: 'Sparkle Dust',
        element: 'air',
        color: '#FFD54F',
        primaryEffect: 'duration',
        emoji: '✨'
    },
    {
        id: 'fire_bloom',
        name: 'Fire Bloom',
        element: 'fire',
        color: '#FF7043',
        primaryEffect: 'frequency',
        emoji: '🌺'
    },
    {
        id: 'moon_moss',
        name: 'Moon Moss',
        element: 'earth',
        color: '#81C784',
        primaryEffect: 'duration',
        emoji: '🌿'
    },
    {
        id: 'rainbow_shard',
        name: 'Rainbow Shard',
        element: 'aether',
        color: '#E040FB',
        primaryEffect: 'intensity',
        emoji: '💎'
    },
    {
        id: 'shadow_berry',
        name: 'Shadow Berry',
        element: 'void',
        color: '#9575CD',
        primaryEffect: 'frequency',
        emoji: '🫐'
    },
];
