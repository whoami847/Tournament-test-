
import { getTournaments } from '@/lib/tournaments-service';
import JoinTournamentClient from '@/components/join-tournament-client';

export async function generateStaticParams() {
  try {
    const tournaments = await getTournaments();
    if (!tournaments || tournaments.length === 0) {
        return [];
    }
    return tournaments.map((tournament) => ({
      id: tournament.id,
    }));
  } catch (error) {
    console.error("Failed to generate static params for tournament join pages:", error);
    return [];
  }
}

export default function JoinTournamentPage() {
    return <JoinTournamentClient />;
}
