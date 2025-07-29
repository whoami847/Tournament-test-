
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getBannersStream } from '@/lib/banners-service';
import { getTournamentsStream } from '@/lib/tournaments-service';
import { getTopPlayersStream } from '@/lib/users-service';
import type { FeaturedBanner, Tournament, PlayerProfile } from '@/types';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { Button } from '@/components/ui/button';
import TournamentCard from '@/components/tournament-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Gamepad2 } from 'lucide-react';

export default function HomePage() {
  const [banners, setBanners] = useState<FeaturedBanner[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [topPlayers, setTopPlayers] = useState<PlayerProfile[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubBanners = getBannersStream((data) => {
      setBanners(data);
      setLoadingBanners(false);
    });
    const unsubTournaments = getTournamentsStream((data) => {
      const upcoming = data.filter(t => t.status === 'upcoming');
      setTournaments(upcoming);
      setLoadingTournaments(false);
    });
    const unsubPlayers = getTopPlayersStream((data) => {
      setTopPlayers(data);
      setLoadingPlayers(false);
    }, 3);

    return () => {
      unsubBanners();
      unsubTournaments();
      unsubPlayers();
    };
  }, []);
  
  const handleBookmarkToggle = (id: string) => {
    setBookmarked(prev => ({ ...prev, [id]: !prev[id] }));
  };


  return (
    <div className="md:pb-8 pb-24 space-y-12">
      {/* --- Banner Carousel --- */}
      <section>
        {loadingBanners ? (
          <Skeleton className="w-full aspect-video md:aspect-[21/7] rounded-none md:rounded-b-lg" />
        ) : (
          <Carousel
            opts={{ loop: true }}
            plugins={[Autoplay({ delay: 5000, stopOnInteraction: false })]}
            className="w-full"
          >
            <CarouselContent>
              {banners.map((banner) => (
                <CarouselItem key={banner.id}>
                  <div className="relative w-full aspect-video md:aspect-[21/7]">
                    <Image
                      src={banner.image}
                      alt={banner.name}
                      fill
                      className="object-cover"
                      data-ai-hint={banner.dataAiHint}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-6 md:p-12 text-white">
                      <p className="font-semibold text-primary">{banner.game}</p>
                      <h2 className="text-3xl md:text-5xl font-bold mt-1">{banner.name}</h2>
                      <p className="text-sm mt-2">{banner.date}</p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="absolute bottom-4 right-4 hidden md:flex gap-2">
                <CarouselPrevious className="static translate-y-0" />
                <CarouselNext className="static translate-y-0" />
            </div>
          </Carousel>
        )}
      </section>

      {/* --- Upcoming Tournaments --- */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Upcoming Tournaments</h2>
          <Button variant="outline" asChild>
            <Link href="/tournaments">View All</Link>
          </Button>
        </div>
        {loadingTournaments ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.slice(0, 3).map((t) => (
              <TournamentCard 
                key={t.id} 
                tournament={t} 
                isBookmarked={!!bookmarked[t.id]} 
                onBookmarkToggle={() => handleBookmarkToggle(t.id)} 
              />
            ))}
          </div>
        )}
      </section>
      
      {/* --- Browse by Game --- */}
      <section className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Browse by Game</h2>
              <Button variant="outline" asChild>
                  <Link href="/games">View All</Link>
              </Button>
          </div>
          <div className="p-6 bg-card border rounded-lg flex items-center justify-center min-h-[12rem]">
              <div className="text-center text-muted-foreground">
                <Gamepad2 className="h-10 w-10 mx-auto mb-2" />
                <p>Game browser coming soon.</p>
              </div>
          </div>
      </section>

      {/* --- Top Players --- */}
      <section className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Top Players</h2>
              <Button variant="outline" asChild>
                  <Link href="/leaderboard">Full Leaderboard</Link>
              </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {loadingPlayers ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />) :
              topPlayers.map((player, i) => (
                  <div key={player.id} className="bg-card border p-4 rounded-lg flex items-center gap-4">
                      <p className="text-2xl font-bold text-muted-foreground w-8 text-center">{i + 1}</p>
                      <Avatar className="h-12 w-12 border-2 border-primary/50">
                          <AvatarImage src={player.avatar} alt={player.name} />
                          <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                          <p className="font-bold">{player.name}</p>
                          <p className="text-sm text-muted-foreground">{player.winrate}% Win Rate</p>
                      </div>
                      {i === 0 && <Crown className="h-6 w-6 text-amber-400 ml-auto" />}
                  </div>
              ))}
          </div>
      </section>
    </div>
  );
}
