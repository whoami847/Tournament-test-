import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Users, Trophy, Calendar } from 'lucide-react';
import type { Tournament } from '@/types';
import { cn } from '@/lib/utils';
import Countdown from './countdown';
import { format } from 'date-fns';

interface TournamentCardProps {
  tournament: Tournament;
  isBookmarked: boolean;
  onBookmarkToggle: () => void;
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-500/80',
  live: 'bg-red-500/80 animate-pulse',
  completed: 'bg-gray-500/80',
};

export default function TournamentCard({ tournament, isBookmarked, onBookmarkToggle }: TournamentCardProps) {
  const statusColor = statusColors[tournament.status] || 'bg-gray-500/80';
  const isFull = tournament.teamsCount >= tournament.maxTeams;

  return (
    <Link href={`/tournaments/${tournament.id}`} className="block h-full group">
      <Card className="relative flex flex-col h-full overflow-hidden transition-all duration-300 shadow-lg rounded-2xl hover:border-primary/50">
        <Image 
          src={tournament.image}
          alt={tournament.name}
          fill
          className="object-cover w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-110"
          data-ai-hint={tournament.dataAiHint as string}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10" />

        <div className="relative z-10 flex flex-col flex-grow p-4 text-white">
          <div className="flex justify-between items-start">
            <Badge className={cn("border-none", statusColor)}>
              {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 flex-shrink-0 bg-black/20 hover:bg-black/40" 
              onClick={(e) => {
                e.preventDefault();
                onBookmarkToggle();
              }}
              aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            >
              <Bookmark className={isBookmarked ? 'fill-primary text-primary' : 'text-white/70'} />
            </Button>
          </div>
          
          <div className="flex-grow flex flex-col justify-end mt-4">
            <p className="text-sm font-semibold text-amber-400">{tournament.game}</p>
            <h3 className="text-2xl font-bold tracking-tight">{tournament.name}</h3>
            
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(tournament.startDate), 'PPP, p')}</span>
              </div>
            </div>

            <div className="flex-grow"></div>

            <div className="mt-auto space-y-4">
                <div className="flex justify-between items-center pt-4 border-t border-white/20">
                    <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        <span>{tournament.teamsCount} / {tournament.maxTeams} teams</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Trophy className="h-4 w-4" />
                        <span>{tournament.prizePool} TK Prize Pool</span>
                    </div>
                </div>
                 {tournament.status === 'upcoming' && (
                    <div className="w-full">
                       <Countdown targetDate={tournament.startDate as string} />
                    </div>
                )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
