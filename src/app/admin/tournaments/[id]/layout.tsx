import { ReactNode } from 'react';
import { getTournaments } from '@/lib/tournaments-service';

export async function generateStaticParams() {
  const tournaments = await getTournaments();
  return tournaments.map((tournament) => ({ id: tournament.id }));
}

export default function AdminTournamentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}