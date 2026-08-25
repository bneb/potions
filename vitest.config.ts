import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './app'),
        },
    },
    test: {
        environment: 'jsdom',
        include: ['tests/**/*.test.{ts,tsx}'],
        setupFiles: ['tests/setup.ts'],
        benchmark: {
            include: ['tests/**/*.bench.{ts,tsx}'],
        },
        coverage: {
            provider: 'v8',
            include: ['app/lib/**'],
        },
    },
});
