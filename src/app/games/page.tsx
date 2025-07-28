'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getGamesStream } from '@/lib/games-service';
import type { GameCategory } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const GameCard = ({ game, index }: { game: GameCategory; index: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
    >
        <Link href={`/games/${game.id}`} className="block group">
            <Card
              className={cn(
                  "cursor-pointer transition-all duration-300 bg-card/50 backdrop-blur-sm border-2 rounded-xl overflow-hidden border-transparent hover:border-primary/50"
              )}
          >
              <div className="relative aspect-square">
                   <Image src={game.image} alt={game.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint={game.dataAiHint} />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                   <div className="absolute bottom-0 left-0 p-3">
                      <h4 className="font-bold text-lg text-primary-foreground">{game.name}</h4>
                  </div>
              </div>
          </Card>
        </Link>
    </motion.div>
);

const GamesGridSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
                <Skeleton className="aspect-square w-full" />
            </div>
        ))}
    </div>
);

export default function GamesPage() {
    const [games, setGames] = useState<GameCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = getGamesStream((data) => {
            setGames(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="container mx-auto px-4 py-8 md:pb-8 pb-24">
            <header className="text-center mb-12">
                <h1 className="text-4xl font-extrabold tracking-tight">Supported Games</h1>
                <p className="text-muted-foreground mt-2">Explore the games featured in our tournaments.</p>
            </header>

            {loading ? (
                <GamesGridSkeleton />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {games.map((game, index) => (
                        <GameCard key={game.id} game={game} index={index} />
                    ))}
                </div>
            )}
        </div>
    );
}
