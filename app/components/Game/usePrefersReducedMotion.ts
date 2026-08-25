"use client";

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
    const mq = typeof window !== 'undefined' ? window.matchMedia?.(QUERY) : undefined;
    if (!mq) return () => undefined;
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
}

/**
 * Live view of the user's prefers-reduced-motion setting.
 *
 * Kids' games love motion, but kids (and their grown-ups) who ask the OS for
 * calmer interfaces deserve one. Implemented with useSyncExternalStore so the
 * server snapshot is always `false`: server-rendered markup and the first
 * client render match (no hydration mismatch), then React re-renders with the
 * real value and keeps following live changes — no effects, no cascades.
 */
export function usePrefersReducedMotion(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => (typeof window !== 'undefined' ? !!window.matchMedia?.(QUERY).matches : false),
        () => false,
    );
}
