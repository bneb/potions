import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

/**
 * Shared jsdom setup: the game uses the Web Audio API, which jsdom does not
 * implement. Provide a deterministic mock so component tests can run (and
 * assert on) audio behaviour without a real AudioContext.
 */
class MockAudioNode {
    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    start = vi.fn();
    stop = vi.fn();
    frequency = {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
    };
    gain = {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
    };
}

class MockAudioContext {
    destination: unknown = new MockAudioNode();
    currentTime = 0;
    state: 'running' | 'suspended' | 'closed' = 'running';
    resume = vi.fn(async () => { this.state = 'running'; });
    suspend = vi.fn(async () => { this.state = 'suspended'; });
    close = vi.fn(async () => { this.state = 'closed'; });
    createOscillator = vi.fn(() => new MockAudioNode());
    createGain = vi.fn(() => new MockAudioNode());
}

if (typeof window !== 'undefined') {
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;

    // This jsdom build does not wire localStorage onto window. Install a tiny
    // in-memory shim so persistence behaviour is exercisable end-to-end
    // (shared here so every suite gets identical semantics).
    if (typeof window.localStorage === 'undefined') {
        const store = new Map<string, string>();
        const shim: Storage = {
            get length() {
                return store.size;
            },
            clear: () => store.clear(),
            getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
            key: (i: number) => Array.from(store.keys())[i] ?? null,
            removeItem: (k: string) => void store.delete(k),
            setItem: (k: string, v: string) => void store.set(k, String(v)),
        };
        Object.defineProperty(window, 'localStorage', { value: shim, configurable: true });
    }

    // Respect-matchMedia is used for reduced-motion support.
    if (!window.matchMedia) {
        window.matchMedia = ((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(() => false),
        })) as unknown as typeof window.matchMedia;
    }
}
