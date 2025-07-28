import { getGame, getGames } from '@/lib/games-service';
import { notFound } from 'next/navigation';
import GameDetailsClient from '@/components/game-details-client';

export async function generateStaticParams() {
  try {
    const games = await getGames();
    if (!games || games.length === 0) {
        return [];
    }
    return games.map((game) => ({
      id: game.id,
    }));
  } catch (error) {
    console.error("Failed to generate static params for games:", error);
    return [];
  }
}

export default async function GameDetailsPage({ params }: { params: { id: string } }) {
  const game = await getGame(params.id);

  if (!game) {
    notFound();
  }

  return <GameDetailsClient initialGame={game} />;
}
