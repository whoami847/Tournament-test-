import { ReactNode } from 'react';
import { getGames } from '@/lib/games-service';

export async function generateStaticParams() {
  const games = await getGames();
  return games.map((game) => ({ id: game.id }));
}

export default function GameLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}