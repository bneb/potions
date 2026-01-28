
import React from 'react';
import { Game } from './components/Game/Game';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Magic Potions | Potions Lab',
  description: 'A magical playground for testing potions on animals.',
};

export default function Home() {
  return (
    <div className="min-h-screen">
      <Game />
    </div>
  );
}
