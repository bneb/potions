
import React from 'react';
import { Game } from './components/Game/Game';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Magic Potions 🧪',
  description: 'Tap a friend, mix a magic potion, watch the wonder.',
};

export default function Home() {
  return (
    <div className="min-h-screen">
      <Game />
    </div>
  );
}
