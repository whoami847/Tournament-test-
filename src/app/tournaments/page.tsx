
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Tournament, Game, GameCategory } from '@/types';
import { getTournamentsStream } from '@/lib/tournaments-service';
import { getGamesStream } from '@/lib/games-service';
import TournamentCard from '@/components/tournament-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const TournamentGridSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
         <Card key={i} className="relative flex flex-col h-[450px] overflow-hidden transition-all duration-300 shadow-lg rounded-2xl bg-card/50 backdrop-blur-sm animate-pulse">
            <div className="relative z-10 flex flex-col flex-grow p-4 text-white">
                <div className="flex justify-between items-start">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <div className="flex-grow flex flex-col justify-end mt-4">
                    <Skeleton className="h-4 w-1/3 mb-2" />
                    <Skeleton className="h-8 w-3/4 mb-4" />
                    <div className="space-y-3">
                      <Skeleton className="h-5 w-full" />
                    </div>
                    <div className="flex-grow"></div>
                    <div className="mt-auto space-y-4">
                        <div className="flex justify-between items-center pt-4 border-t border-muted/20">
                            <Skeleton className="h-5 w-1/3" />
                            <Skeleton className="h-5 w-1/3" />
                        </div>
                        <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                </div>
            </div>
        </Card>
      ))}
    </div>
);

const GameFilterCard = ({ game, isSelected, onSelect }: { game: GameCategory | {id: 'all', name: 'All Games', image: ''}, isSelected: boolean, onSelect: () => void }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.05 }}
        className="w-full"
    >
        <Card
            onClick={onSelect}
            className={cn(
                "cursor-pointer transition-all duration-300 bg-card/50 backdrop-blur-sm border-2",
                isSelected ? "border-primary shadow-lg shadow-primary/20" : "border-transparent hover:border-primary/50"
            )}
        >
            <CardContent className="p-3 flex items-center gap-4">
                {game.id !== 'all' ? (
                     <Image src={game.image} alt={game.name} width={48} height={48} className="rounded-md object-cover aspect-square" data-ai-hint={game.dataAiHint} />
                ) : (
                    <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                        <span className="text-2xl font-bold">All</span>
                    </div>
                )}
                <h4 className="font-bold text-lg">{game.name}</h4>
            </CardContent>
        </Card>
    </motion.div>
);


export default function TournamentsPage() {
  const searchParams = useSearchParams();
  const gameFromQuery = searchParams.get('game') as Game | null;

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [games, setGames] = useState<GameCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | 'all'>(gameFromQuery || 'all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'live' | 'upcoming' | 'completed'>('upcoming');
  const [selectedFormat, setSelectedFormat] = useState<any>('all');
  const [selectedSubMode, setSelectedSubMode] = useState<any>('all');
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  useEffect(() => {
    const unsubscribeTournaments = getTournamentsStream((data) => {
      setTournaments(data);
      setLoading(false);
    });
    const unsubscribeGames = getGamesStream(setGames);
    return () => {
        unsubscribeTournaments();
        unsubscribeGames();
    };
  }, []);

  useEffect(() => {
    const gameFromQuery = searchParams.get('game') as Game | null;
    setSelectedGame(gameFromQuery || 'all');
    if (gameFromQuery) {
      setSelectedStatus('upcoming');
    }
  }, [searchParams]);

  const handleBookmarkToggle = (id: string) => {
    setBookmarked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFormatChange = (format: any) => {
    setSelectedFormat(format);
    setSelectedSubMode('all');
  };

  const filteredTournaments = useMemo(() => {
    return tournaments.filter(tournament => {
      const matchesGame = selectedGame === 'all' || tournament.game === selectedGame;
      const matchesStatus = selectedStatus === 'all' || tournament.status === selectedStatus;
      const matchesBookmark = !showBookmarkedOnly || !!bookmarked[tournament.id];
      
      const matchesFormat = (() => {
        if (selectedFormat === 'all') return true;
        
        const [primaryMode, subMode] = tournament.format.split('_');
        if (primaryMode !== selectedFormat) return false;
        
        if (selectedSubMode === 'all') return true;

        return subMode?.toLowerCase() === selectedSubMode;
      })();

      return matchesGame && matchesStatus && matchesBookmark && matchesFormat;
    });
  }, [tournaments, selectedGame, selectedStatus, selectedFormat, selectedSubMode, showBookmarkedOnly, bookmarked]);
  
  const formats: any[] = ['BR', 'CS', 'LONE WOLF'];
  
  const subModeOptions: { [key: string]: any[] } = {
    'BR': ['all', 'solo', 'duo', 'squad'],
    'CS': ['all', 'solo', 'duo', 'squad'],
    'LONE WOLF': ['all', 'solo', 'duo'],
  };
  const currentSubModes = subModeOptions[selectedFormat];

  return (
    <div className="container mx-auto px-4 py-8 md:pb-8 pb-24">
      <div className="space-y-8">
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <GameFilterCard
                game={{ id: 'all', name: 'All Games', image: '' }}
                isSelected={selectedGame === 'all'}
                onSelect={() => setSelectedGame('all')}
            />
            {games.map(game => (
                <GameFilterCard
                    key={game.id}
                    game={game}
                    isSelected={selectedGame === game.name}
                    onSelect={() => setSelectedGame(game.name)}
                />
            ))}
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 p-1 bg-muted/50 backdrop-blur-sm rounded-full flex-wrap self-start">
              <Button variant={selectedStatus === 'all' ? 'default' : 'ghost'} size="sm" className="rounded-full h-8 px-4" onClick={() => setSelectedStatus('all')}>All</Button>
              <Button variant={selectedStatus === 'live' ? 'default' : 'ghost'} size="sm" className="rounded-full h-8 px-4" onClick={() => setSelectedStatus('live')}>Ongoing</Button>
              <Button variant={selectedStatus === 'upcoming' ? 'default' : 'ghost'} size="sm" className="rounded-full h-8 px-4" onClick={() => setSelectedStatus('upcoming')}>Upcoming</Button>
              <Button variant={selectedStatus === 'completed' ? 'default' : 'ghost'} size="sm" className="rounded-full h-8 px-4" onClick={() => setSelectedStatus('completed')}>Finished</Button>
          </div>

           <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-col md:flex-row gap-2 self-start sm:self-center w-full">
              <div className="flex items-center gap-2 p-1 bg-muted/50 backdrop-blur-sm rounded-full self-start flex-wrap">
                <Button variant={selectedFormat === 'all' ? 'default' : 'ghost'} size="sm" className="rounded-full h-8 px-4" onClick={() => handleFormatChange('all')}>All Modes</Button>
                {formats.map(format => (
                  <Button 
                    key={format} 
                    variant={selectedFormat === format ? 'default' : 'ghost'} 
                    size="sm" 
                    className="rounded-full h-8 px-4" 
                    onClick={() => handleFormatChange(format)}
                  >
                    {format === 'LONE WOLF' ? 'Lone Wolf' : format}
                  </Button>
                ))}
              </div>

              {currentSubModes && (
                <div className="flex items-center gap-2 p-1 bg-muted/50 backdrop-blur-sm rounded-full self-start flex-wrap">
                  {currentSubModes.map(subMode => (
                      <Button 
                          key={subMode}
                          variant={selectedSubMode === subMode ? 'default' : 'ghost'}
                          size="sm"
                          className="rounded-full h-8 px-4"
                          onClick={() => setSelectedSubMode(subMode)}
                      >
                          {subMode === 'all' ? 'All Types' : subMode.charAt(0).toUpperCase() + subMode.slice(1)}
                      </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-center">
              <Switch id="bookmarks-only" checked={showBookmarkedOnly} onCheckedChange={setShowBookmarkedOnly} />
              <Label htmlFor="bookmarks-only">My Bookmarks</Label>
            </div>
          </div>
        </div>

        {loading ? (
            <TournamentGridSkeleton />
        ) : filteredTournaments.length > 0 ? (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
            {filteredTournaments.map(tournament => (
              <motion.div
                key={tournament.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                  <TournamentCard 
                    tournament={tournament}
                    isBookmarked={!!bookmarked[tournament.id]}
                    onBookmarkToggle={() => handleBookmarkToggle(tournament.id)}
                  />
              </motion.div>
            ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-16 border border-dashed rounded-lg">
            <h3 className="text-xl font-medium">No Tournaments Found</h3>
            <p className="text-muted-foreground mt-2">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
