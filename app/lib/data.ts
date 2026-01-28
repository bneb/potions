
import { Animal, Potion, Treat } from './schemas';

// --- Assets are in /public/assets, so we reference them as /assets/... ---

export const ANIMALS: Animal[] = [
    { id: 'trex', name: 'T-Rex', imageSrc: '/assets/trex.png' },
    { id: 'monkey', name: 'Monkey', imageSrc: '/assets/monkey.png' },
    { id: 'santa', name: 'Santa Claus', imageSrc: '/assets/santa.png' },
    { id: 'crocodile', name: 'Crocodile', imageSrc: '/assets/crocodile.png' },
    { id: 'reindeer', name: 'Reindeer', imageSrc: '/assets/reindeer.png' },
    { id: 'candy', name: 'Candy', imageSrc: '/assets/candy.png' },
    { id: 'husky', name: 'Husky', imageSrc: '/assets/husky.png' },
    { id: 'scorpion', name: 'Scorpion', imageSrc: '/assets/scorpion.png' },
    { id: 'rolly', name: 'Rolly Polly', imageSrc: '/assets/rolly-polly.png' },
    { id: 'tree', name: 'Christmas Tree', imageSrc: '/assets/christmas-tree.png' },
    { id: 'shark', name: 'Shark', imageSrc: '/assets/shark.png' },
    { id: 'ftoddler', name: 'Flower Toddler', imageSrc: '/assets/flower-toddler.png' },
    { id: 'fmommy', name: 'Flower Mommy', imageSrc: '/assets/flower-mommy.png' },
    { id: 'fdaddy', name: 'Flower Daddy', imageSrc: '/assets/flower-daddy.png' },
    { id: 'fbigboy', name: 'Flower Big Boy', imageSrc: '/assets/flower-bigboy.png' },
    { id: 'orangutan', name: 'Orangutan', imageSrc: '/assets/monkey.png' }, // Placeholder or complex HTML replacement later
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
