# Magic Potions 🧪✨

A delightfully magical browser game for kids aged 3–5. Tap an animal friend,
feed them potions and treats, and watch them grow, shrink, sparkle, and go
full rainbow — with joyful sounds and confetti celebrations.

Built with Next.js 16, React 19, Tailwind CSS 4, and the Web Audio API.

## Getting Started

First, run the development server:

```bash
npm install        # add --cache "$PWD/.npm-cache" if the global npm cache is not writable
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Engineering Workflow (TDD + Micro-benchmarks)

This project follows strict red→green test-driven development and keeps
micro-benchmarks for all hot paths.

```bash
npm run test           # run the full Vitest suite once
npm run test:watch     # watch mode
npm run test:coverage  # coverage over app/lib/**
npm run bench          # micro-benchmarks (tinybench via vitest bench)
npx tsc --noEmit       # typecheck gate
npm run lint           # eslint
npm run build          # production build gate
```

- Tests live in `tests/**/*.test.{ts,tsx}`; jsdom environment with a Web Audio
  mock provided by `tests/setup.ts`.
- Benchmarks live in `tests/**/*.bench.ts` and must consume results so the
  optimizer cannot fold them away.
- Performance budgets and baseline numbers: see `docs/perf-budgets.md`.
- Game logic lives in pure modules under `app/lib/**` (no React/DOM imports)
  so it can be tested and benchmarked headlessly.

## Deploy on Vercel

The easiest way to deploy this app is using the [Vercel Platform](https://vercel.com/new).
