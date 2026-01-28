let selectedAnimalId = null;

// ========== INFINITE CAROUSEL ==========
document.addEventListener('DOMContentLoaded', () => {
    initInfiniteCarousel();
});

function initInfiniteCarousel() {
    const track = document.querySelector('.animals-track');
    const container = document.querySelector('.animals-container');
    if (!track || !container) return;

    // Clear any existing clones first to prevent duplicates on re-runs
    // (In case this function runs multiple times)
    // Actually, simpler to just work with what we have if we assume fresh load.

    const originalItems = [...track.children];

    // We need 3 SETS total: [Clone 1] [Original] [Clone 2]
    // The previous CSS Step made 2 sets. Let's reset and build 3 solid sets.

    // Clear track content
    track.innerHTML = '';

    // Helper to create a set
    const createSet = () => {
        const setContainer = document.createDocumentFragment();
        originalItems.forEach(item => {
            const clone = item.cloneNode(true);
            const originalId = item.id; // e.g. "animal-trex"
            const animalType = originalId ? originalId.replace('animal-', '') :
                (item.dataset.animalType || ''); // fallback

            // Set data attribute for robust selection of all clones
            clone.dataset.animalType = animalType;
            clone.removeAttribute('id');

            clone.onclick = () => {
                selectAnimal(animalType);
            };
            setContainer.appendChild(clone);
        });
        return setContainer;
    };

    // Append 3 sets
    track.appendChild(createSet()); // Set 1 (Left Buffer)
    track.appendChild(createSet()); // Set 2 (Main)
    track.appendChild(createSet()); // Set 3 (Right Buffer)

    // Wait for layout
    setTimeout(() => {
        // Calculate dimensions directly from the track content
        // Track width should be roughly 3x a single set
        const totalScrollWidth = track.scrollWidth;
        const oneSetWidth = totalScrollWidth / 3;

        // Start in the Middle Set (Set 2)
        // Set 2 starts at offset = oneSetWidth
        container.scrollLeft = oneSetWidth;

        // Infinite Scroll Logic
        container.addEventListener('scroll', () => {
            const currentScroll = container.scrollLeft;

            // If we drift into Set 3 (Right Buffer)
            // ideally reset when we've scrolled exactly one set width relative to start
            // i.e., currentScroll >= oneSetWidth * 2

            if (currentScroll >= oneSetWidth * 2) {
                // Determine how far past the boundary we are
                const overflow = currentScroll - (oneSetWidth * 2);
                // Snap back to start of Set 2 + overflow
                container.scrollLeft = oneSetWidth + overflow;
            }
            // If we drift into Set 1 (Left Buffer)
            else if (currentScroll <= 0) {
                // Snap forward to start of Set 2 (which is oneSetWidth)
                // But strictly, currentScroll might be close to 0 but not exactly?
                // If <= 0, we are at far left. 
                // We want to be at start of Set 2? 
                // Wait, Set 1 ends at oneSetWidth.
                // Ideally we reset BEFORE hitting 0 to avoid edge bounce.

                // Let's reset when < oneSetWidth / 2?
                // No, standard is:
                // range is [oneSetWidth, 2*oneSetWidth]
            }
            // Check bounds strictly
            // Upper bound reset
            if (currentScroll >= oneSetWidth * 2) {
                container.scrollLeft = currentScroll - oneSetWidth;
            }
            // Lower bound reset
            else if (currentScroll <= 0) { // Actually, let's trigger earlier?
                // If we are deep in Set 1...
                container.scrollLeft = currentScroll + oneSetWidth;
            }
            // Optimization: If currentScroll < oneSetWidth (inside Set 1)
            // We can aggressively map it to Set 2?
            else if (currentScroll < oneSetWidth * 0.1) {
                // Close to edge, safeguard
                container.scrollLeft = currentScroll + oneSetWidth;
            }
        });
    }, 100);
}

// ========== SOUND EFFECTS (Web Audio API) ==========
// Create audio context on first user interaction
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Fun "pop" sound for selection
function playPopSound() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
}

// Magical sparkle sound for potions
function playMagicSound() {
    initAudio();
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6 - ascending arpeggio

    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const startTime = audioCtx.currentTime + (i * 0.08);
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
    });
}

// Growth whoosh sound
function playGrowthSound() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.35);
}

// Shrink squeak sound
function playShrinkSound() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.25);
}

// Rainbow shimmer sound
function playRainbowSound() {
    initAudio();
    for (let i = 0; i < 5; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const freq = 300 + (i * 150);
        const startTime = audioCtx.currentTime + (i * 0.05);

        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
    }
}

// Present unwrap sound
function playPresentSound() {
    initAudio();
    // Pop!
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);

    osc1.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1);
    gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.15);

    // Sparkle after
    setTimeout(() => playMagicSound(), 100);
}

// Sunshine chime
function playSunshineSound() {
    initAudio();
    const notes = [784, 988, 1175, 1319]; // G5, B5, D6, E6 - bright ascending
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const startTime = audioCtx.currentTime + (i * 0.06);
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
    });
}

// Hotdog yum sound (silly boing)
function playHotdogSound() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    // Bouncy frequency
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.2);
    osc.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.35);
}

// Error buzz
function playErrorSound() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'square';
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
}

function selectAnimal(animalType) {
    // Select ALL matching wrappers (originals + clones)
    // We can find them by the ID pattern (relying on ID is tricky with clones)
    // OR we can find them by the image src or a data attribute.
    // Let's assume we update the init function to add data attributes, 
    // OR we can just search for the image alt or similar.
    // Simplest given current state: search by onclick attribute? No.
    // Search by class + check internal ID? 
    // Actually, in the initInfiniteCarousel, we strip IDs.
    // BUT we know the structure.

    // Robust way: Use the image src or alt text to identify? 
    // Or just look for the class and checking a data attribute we ADD now.

    // Let's blindly select all, then filter? No.
    // Let's look for the specific animal class? 
    // Start with: Deselect all
    document.querySelectorAll('.animal-wrapper').forEach(el => el.classList.remove('selected'));

    if (selectedAnimalId === animalType) {
        selectedAnimalId = null; // deselect
        playPopSound();
    } else {
        selectedAnimalId = animalType;

        // Find all instances
        // We will add data-animal-type to them in initInfiniteCarousel
        const allInstances = document.querySelectorAll(`.animal-wrapper[data-animal-type="${animalType}"]`);

        if (allInstances.length > 0) {
            allInstances.forEach(wrapper => {
                wrapper.classList.add('selected');
                playClickAnimation(wrapper);
            });
            playPopSound();
        } else {
            // Fallback if data attribute not yet set (e.g. before init runs fully?)
            // Try to find by ID (original)
            const original = document.getElementById(`animal-${animalType}`);
            if (original) {
                original.classList.add('selected');
                playClickAnimation(original);
                playPopSound();
            }
        }
    }
}

function usePotion(potionType) {
    if (!selectedAnimalId) {
        // Feedback: Shake the animals to show "Select me first!"
        const track = document.querySelector('.animals-track');
        track.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], { duration: 300 });
        playErrorSound();
        return;
    }

    // Find all animal images for the selected type
    // Because we wrapped them and they are clones, we need to find all instances.
    const animalInstances = document.querySelectorAll(`.animal-wrapper[data-animal-type="${selectedAnimalId}"] .animal`);
    const sorcerer = document.querySelector('.sorcerer');

    // 1. Animate Sorcerer
    sorcerer.classList.add('cast-spell');
    setTimeout(() => sorcerer.classList.remove('cast-spell'), 500);

    // 2. Apply Effect to ALL Instances
    // This ensures that if the user scrolls and sees a clone, it is also affected.
    animalInstances.forEach(img => {
        applyEffect(img, potionType);
        // 3. Create Magic Particles on the visible one? Or all? 
        // All is fine, particles are cheap enough.
        createParticles(img);
    });
}

// New function for giving physical items (Treats)
function giveItem(itemType) {
    if (!selectedAnimalId) {
        // Shake logic
        const track = document.querySelector('.animals-track');
        track.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], { duration: 300 });
        playErrorSound();
        return;
    }

    const animalInstances = document.querySelectorAll(`.animal-wrapper[data-animal-type="${selectedAnimalId}"] .animal`);
    const sorcerer = document.querySelector('.sorcerer');

    // Animate Sorcerer
    sorcerer.classList.add('cast-spell');
    setTimeout(() => sorcerer.classList.remove('cast-spell'), 500);

    // Play sound based on item
    if (itemType === 'banana') {
        playPopSound();
    } else if (['pizza', 'icecream', 'hotdog', 'bone', 'bouquet', 'sunglasses'].includes(itemType)) {
        playPresentSound();
    } else {
        playPresentSound();
    }

    // Spawn the item on top of the animal
    animalInstances.forEach(img => {
        spawnItemOverAnimal(img, itemType, selectedAnimalId);
    });
}

function spawnItemOverAnimal(animalImg, itemType, animalId) {
    const parent = animalImg.closest('.animal-wrapper');
    const existingItem = parent.querySelector('.floating-item');
    if (existingItem) existingItem.remove();

    const itemEl = document.createElement('div');
    itemEl.classList.add('floating-item');

    // Define item content (Image or Emoji)
    let content = '';
    let isBoneForDog = false;

    // Special Logic: Present for Husky = Bone
    if (itemType === 'present' && animalId === 'husky') {
        itemType = 'bone'; // Auto-convert
        isBoneForDog = true;
    }

    if (itemType === 'hotdog') {
        content = '🌭';
    } else if (itemType === 'present') {
        content = '🎁';
    } else if (itemType === 'banana') {
        content = '🍌';
    } else if (itemType === 'pizza') {
        content = '🍕';
    } else if (itemType === 'icecream') {
        content = '🍦';
    } else if (itemType === 'bone') {
        content = '🦴';
    } else if (itemType === 'bouquet') {
        content = '💐';
    } else if (itemType === 'sunglasses') {
        content = '🕶️';
    }

    itemEl.innerHTML = content;

    // Default Styling the floating item
    itemEl.style.position = 'absolute';
    itemEl.style.zIndex = '20';
    itemEl.style.pointerEvents = 'none';
    itemEl.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))';
    itemEl.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

    // Positioning Logic
    if (itemType === 'sunglasses') {
        // Sunglasses go on EYES (Upper Center-ish)
        itemEl.style.top = '25%'; // Approximate eye level
        itemEl.style.left = '50%';
        itemEl.style.transform = 'translate(-50%, -50%) scale(0)';
        itemEl.style.width = '80px'; // Force width for glasses

        // Tweaks for specific animals if needed?
        // Starting generic.
    } else {
        // Food/Gifts go at bottom/center (feet/hands)
        itemEl.style.bottom = '10px';
        itemEl.style.left = '50%';
        itemEl.style.transform = 'translateX(-50%) scale(0)';
        itemEl.style.fontSize = '4rem'; // For emojis
    }

    // Image sizing if it's an image
    if (content.includes('<img')) {
        // managed by CSS .floating-item img
    }

    parent.appendChild(itemEl);

    // Animate in
    requestAnimationFrame(() => {
        if (itemType === 'sunglasses') {
            itemEl.style.transform = 'translate(-50%, -50%) scale(1)';
        } else {
            itemEl.style.transform = 'translateX(-50%) scale(1) translateY(-40px)';
        }
    });
}

function applyEffect(element, type) {
    const parent = element.parentElement;

    // Remove OLD floating items if we use a potion?
    // User didn't ask, but maybe logical. 
    // Let's keep them mutually exclusive if it gets messy?
    // Actually, Potions modify the animal. Items are just "given".
    // Let's remove old floating items when using a NEW potion to clean up.
    // Except maybe Sunshine/Hotdog which were potions previously.

    // Remove "Sunshine" or "Hotdog" old implementations if they were overlays
    // (Sunshine had .sunbeams, Hotdog was an overlay)
    const oldSun = parent.querySelector('.sunbeams');
    if (oldSun) oldSun.remove();

    const oldItem = parent.querySelector('.floating-item');
    if (oldItem) oldItem.remove();

    // Clear standard effects
    element.style.filter = '';
    element.style.transform = '';
    element.classList.remove('rainbow-effect'); // Changed from effect-rainbow to match existing class

    // Let's clear conflicting classes first
    element.classList.remove('effect-small', 'effect-big'); // Clear size classes

    if (type === 'growth') {
        element.style.transform = 'scale(1.3)';
        playGrowthSound();
    } else if (type === 'shrink') {
        element.style.transform = 'scale(0.7)';
        playShrinkSound();
    } else if (['red', 'purple'].includes(type)) {
        // Colors
        element.style.filter = ''; // Reset rainbow animation or other filters
        element.classList.remove('rainbow-effect');

        // Simple hue rotate or color overlay approximation using CSS filter

        if (type === 'red') {
            // Reddish filter
            element.style.filter = 'sepia(1) saturate(5) hue-rotate(-50deg)'; // Updated filter
        } else if (type === 'purple') {
            // Purple filter
            element.style.filter = 'sepia(1) saturate(5) hue-rotate(220deg)'; // Updated filter
        }
        playMagicSound(); // Color change sparkle
    } else if (type === 'rainbow') {
        element.style.filter = ''; // Reset specific color filters
        element.classList.add('rainbow-effect'); // Uses CSS Animation
        playRainbowSound();
    } else if (type === 'present') {
        spawnPresent(element);
        playPresentSound();
    } else if (type === 'sunshine') {
        removeEffects(element.parentElement); // Clean cleanup
        // Spawns sunbeams behind
        const beams = document.createElement('div');
        beams.classList.add('sunbeams');
        parent.insertBefore(beams, element); // Behind animal
        // Also apply yellow color to animal? User said "yellow color with sunshine"
        element.style.filter = 'sepia(1) saturate(10) hue-rotate(0deg) drop-shadow(0 0 15px gold)';
        playSunshineSound();
    } else if (type === 'hotdog') {
        spawnHotdog(element.parentElement);
        playHotdogSound();
    }
}

function removeEffects(wrapper) {
    const existingPresents = wrapper.querySelectorAll('.present-gift');
    existingPresents.forEach(el => el.remove());

    const existingSun = wrapper.querySelectorAll('.sunbeam-container');
    existingSun.forEach(el => el.remove());

    const existingHotdog = wrapper.querySelectorAll('.hotdog-item');
    existingHotdog.forEach(el => el.remove());
}

function spawnPresent(targetElement) {
    // Check if present already exists? Let's allow multiple for fun!

    // The targetElement is the IMG. Its parent is the wrapper.
    const wrapper = targetElement.parentElement;

    // Remove existing presents to prevent clutter?
    // const existing = wrapper.querySelector('.present-gift');
    // if(existing) existing.remove();

    const present = document.createElement('div');
    present.textContent = '🎁';
    present.classList.add('present-gift');
    present.style.fontSize = '4rem';

    wrapper.appendChild(present);

    // Fade out after a while? Or keep it? keeping it is fun for toddlers.
    // Maybe pop it after 3 seconds?
    setTimeout(() => {
        present.style.opacity = '0';
        present.style.transition = 'opacity 1s';
        setTimeout(() => present.remove(), 1000);
    }, 4000);
}

function applySunshine(wrapper) {
    const container = document.createElement('div');
    container.classList.add('sunbeam-container');

    const beams = document.createElement('div');
    beams.classList.add('sunbeam');

    const flare = document.createElement('div');
    flare.classList.add('lens-flare');

    container.appendChild(beams);
    container.appendChild(flare);
    wrapper.appendChild(container);
}

function spawnHotdog(wrapper) {
    const hotdog = document.createElement('div');
    hotdog.textContent = '🌭';
    hotdog.classList.add('hotdog-item');
    hotdog.style.fontSize = '4rem';
    wrapper.appendChild(hotdog);
}

function createParticles(targetElement) {
    const rect = targetElement.getBoundingClientRect();
    const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };

    for (let i = 0; i < 10; i++) {
        const particle = document.createElement('div');
        particle.classList.add('magic-sparkle');

        // Random position spread from center
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.5) * 100;

        particle.style.left = (center.x + x) + 'px';
        particle.style.top = (center.y + y) + 'px';

        // Random color
        const colors = ['#ffeb3b', '#ff4081', '#00bcd4', '#76ff03'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];

        document.body.appendChild(particle);

        // Cleanup
        setTimeout(() => particle.remove(), 1000);
    }
}

function playClickAnimation(element) {
    element.animate([
        { transform: 'scale(0.95)' },
        { transform: 'scale(1.05)' },
        { transform: 'scale(1)' }
    ], { duration: 200 });
}
