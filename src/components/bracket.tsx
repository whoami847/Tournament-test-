
"use client";

import type { Match, Round, Team, Tournament } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import React, { useMemo, useState } from 'react';
import { Video, Swords, Trophy, User, Users, Crown, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

// --- SOLO BRACKET COMPONENTS ---

const SoloPlayerCard = ({ player }: { player: Team }) => (
    <div className="flex items-center gap-3 bg-card-foreground/5 p-3 rounded-md">
        <div className="bg-muted rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-muted-foreground" />
        </div>
        <span className="font-medium truncate">{player.name}</span>
    </div>
);

export const processBracketForWinners = (bracket: Round[]): Round[] => {
    const newBracket: Round[] = JSON.parse(JSON.stringify(bracket));

    const getMatchWinner = (match: Match): Team | null => {
        if (!match || match.status !== 'completed' || !match.teams[0] || !match.teams[1]) return null;
        return match.scores[0] > match.scores[1] ? match.teams[0] : match.teams[1];
    };

    for (let i = 0; i < newBracket.length - 1; i++) {
      const currentRound = newBracket[i];
      const nextRound = newBracket[i + 1];
      for (let j = 0; j < currentRound.matches.length; j++) {
        const winner = getMatchWinner(currentRound.matches[j]);
        if (winner) {
            const nextMatchIndex = Math.floor(j / 2);
            const teamIndexInNextMatch = j % 2;
            if (nextRound.matches[nextMatchIndex] && nextRound.matches[nextMatchIndex].teams[teamIndexInNextMatch] === null) {
               nextRound.matches[nextMatchIndex].teams[teamIndexInNextMatch] = winner;
            }
        }
      }
    }
    return newBracket;
}

export const SoloBracket = ({ tournament }: { tournament: Tournament }) => {
    const processedBracket = useMemo(() => {
        if (!tournament.bracket || tournament.status !== 'completed') return tournament.bracket;
        return processBracketForWinners(tournament.bracket);
    }, [tournament.bracket, tournament.status]);
    
    const winner = useMemo(() => {
        if (tournament.status !== 'completed' || !processedBracket || processedBracket.length === 0) {
            return null;
        }
        const finalRound = processedBracket[processedBracket.length - 1];
        if (!finalRound || finalRound.matches.length !== 1) return null;
        const finalMatch = finalRound.matches[0];
        if (finalMatch.status !== 'completed' || !finalMatch.teams[0] || !finalMatch.teams[1]) return null;
        const [team1, team2] = finalMatch.teams;
        const [score1, score2] = finalMatch.scores;
        return score1 > score2 ? team1 : team2;
    }, [tournament.status, processedBracket]);

    return (
        <Tabs defaultValue="players" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-card p-1 rounded-full h-auto">
                <TabsTrigger value="players" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Players
                </TabsTrigger>
                <TabsTrigger value="winner" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Winner
                </TabsTrigger>
            </TabsList>
            <TabsContent value="players" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Participants ({tournament.participants.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {tournament.participants.map(player => (
                            <SoloPlayerCard key={player.id} player={player} />
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="winner" className="mt-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Tournament Winner</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center py-16">
                       {winner ? (
                           <div className="flex flex-col items-center gap-4 text-center">
                                <Crown className="h-16 w-16 text-amber-400" />
                                <div className="bg-muted rounded-full h-24 w-24 flex items-center justify-center border-4 border-amber-400">
                                   <User className="h-12 w-12 text-muted-foreground" />
                                </div>
                                <h2 className="text-2xl font-bold mt-2">{winner.name}</h2>
                                <p className="font-semibold uppercase text-amber-400">Champion</p>
                           </div>
                       ) : (
                           <div className="text-center text-muted-foreground space-y-2">
                                <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50" />
                                <p className="font-medium">The winner has not been decided yet.</p>
                                <p className="text-sm">Check back after the tournament is completed.</p>
                           </div>
                       )}
                    </CardContent>
                 </Card>
            </TabsContent>
        </Tabs>
    );
};


// --- TEAM BRACKET COMPONENTS ---

export const ChampionCard = ({ team }: { team: Team }) => {
    return (
        <Card className="border-amber-400 border-2 shadow-lg shadow-amber-400/20 w-full max-w-xs bg-card">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <Trophy className="h-10 w-10 text-amber-400" />
                <Avatar className="h-16 w-16 border-2 border-amber-400">
                    <AvatarImage src={team.avatar} alt={team.name} data-ai-hint="team logo" />
                    <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold">{team.name.startsWith('Team ') ? (team.members || []).map(m => m.name).join(' & ') : team.name}</h3>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Tournament Champion</p>
            </CardContent>
        </Card>
    )
}

export const ChampionPlaceholder = () => (
    <Card className="border-primary/50 border-2 border-dashed shadow-lg shadow-primary/10 w-full max-w-xs bg-card">
        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <Trophy className="h-10 w-10 text-primary/50" />
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <span className="text-2xl font-bold text-muted-foreground">?</span>
            </div>
            <h3 className="text-xl font-bold">Future Champion</h3>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/50">Winner of the Finals</p>
        </CardContent>
    </Card>
)

const TeamDisplay = ({ team, score, isWinner, isLoser }: { team: Team | null, score?: number, isWinner?: boolean, isLoser?: boolean }) => {
  const teamNameAndAvatar = team ? (
    <>
        <Avatar className="h-5 w-5 flex-shrink-0">
          <AvatarImage src={team.avatar} alt={team.name} data-ai-hint="team logo" />
          <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className={cn(
            "text-xs truncate", 
            isWinner ? "font-bold text-foreground" : "font-medium text-muted-foreground",
            isLoser && "font-medium text-destructive/80 opacity-70"
        )}>
          {team.name.startsWith('Team ') ? (team.members || []).map(m => m.name).join(' & ') : team.name}
        </span>
         {team.members && team.members.length > 0 && (
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 flex-shrink-0">
                        <ChevronDown className="h-3 w-3" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Team Members</h4>
                        <div className="space-y-1">
                            {team.members.map((member, index) => (
                                <div key={index} className="flex justify-between items-center text-xs">
                                    <span>{member.name}</span>
                                    <span className="text-muted-foreground">{member.gamerId}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        )}
    </>
  ) : (
    <>
        <div className="h-5 w-5 rounded-md bg-muted/20 flex-shrink-0 flex items-center justify-center">
            <Swords className="h-3 w-3 text-muted-foreground" />
        </div>
        <span className="text-muted-foreground text-xs">Team TBD</span>
    </>
  );

  const teamRowContent = (
      <div className="flex items-center justify-between p-2 h-9 w-full">
          <div className="flex items-center gap-2 overflow-hidden">
            {teamNameAndAvatar}
          </div>
          {typeof score !== 'undefined' && (
            <span className={cn(
              "font-bold text-sm", 
              isWinner ? "text-amber-400" : "text-muted-foreground/50",
              isLoser && "text-destructive/80 opacity-70"
            )}>
              {score}
            </span>
          )}
      </div>
  );

  if (isWinner) {
    return (
        <div className="relative p-[1.5px] overflow-hidden rounded-md">
            <div className="absolute inset-0 animate-border-spin bg-[conic-gradient(from_180deg_at_50%_50%,#fcd34d_0deg,#b45309_180deg,#fcd34d_360deg)]" />
            <div className="relative bg-card rounded-[calc(var(--radius)-3px)]">
                {teamRowContent}
            </div>
        </div>
    );
  }

  return teamRowContent;
};

const MatchCard = ({ match, highlightTeam1AsWinner, highlightTeam2AsWinner }: { match: Match | null, highlightTeam1AsWinner?: boolean, highlightTeam2AsWinner?: boolean }) => {
    const team1 = match?.teams?.[0] ?? null;
    const team2 = match?.teams?.[1] ?? null;
    const score1 = match?.scores?.[0] ?? 0;
    const score2 = match?.scores?.[1] ?? 0;
    const status = match?.status ?? 'pending';

    const isCompleted = status === 'completed';
    const winner1 = isCompleted && score1 > score2;
    const winner2 = isCompleted && score2 > score1;
    const loser1 = isCompleted && score1 < score2;
    const loser2 = isCompleted && score2 < score1;
    
    const hasAdvancedWinners = !!(highlightTeam1AsWinner || highlightTeam2AsWinner);

    const MatchContent = () => (
        <div className="p-0">
            <TeamDisplay team={team1} score={score1} isWinner={(isCompleted && winner1) || highlightTeam1AsWinner} isLoser={loser1} />
            <div className="relative border-t border-border/50 mx-2">
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-1 text-xs text-muted-foreground">
                VS
              </span>
            </div>
            <TeamDisplay team={team2} score={score2} isWinner={(isCompleted && winner2) || highlightTeam2AsWinner} isLoser={loser2} />
        </div>
    );
    
    const animatedCardHeight = 'h-[76px]';

    if (isCompleted || hasAdvancedWinners) {
        return (
            <div className={cn("bg-card rounded-lg w-full flex-shrink-0 border border-transparent shadow-sm", animatedCardHeight)}>
                <MatchContent />
            </div>
        );
    }

    return (
        <div className={cn("relative p-[1.5px] rounded-lg overflow-hidden w-full", animatedCardHeight)}>
             <div className="absolute inset-0 animate-border-spin bg-[conic-gradient(from_180deg_at_50%_50%,hsl(var(--muted-foreground))_0deg,hsl(var(--primary-foreground))_180deg,hsl(var(--muted-foreground))_360deg)]" />
             <div className={cn("relative z-10 bg-card rounded-[calc(var(--radius)-2px)] h-full")}>
                 <MatchContent />
             </div>
        </div>
    );
};

const SingleMatchDisplay = ({ match, highlightTeam1AsWinner, highlightTeam2AsWinner }: { match: Match | null, highlightTeam1AsWinner?: boolean, highlightTeam2AsWinner?: boolean }) => {
    return (
      <div className="w-full md:w-48">
        <div className="flex justify-between items-center mb-1 h-4">
          <p className="text-[9px] text-muted-foreground">{match?.name ?? ''}</p>
          {match?.status === 'live' && (
            <Badge variant="default" className="flex items-center gap-1 text-[9px] h-3 px-1.5 bg-red-500 border-none">
                <Video className="h-2 w-2" />
                Live
            </Badge>
          )}
        </div>
        <MatchCard match={match} highlightTeam1AsWinner={highlightTeam1AsWinner} highlightTeam2AsWinner={highlightTeam2AsWinner}/>
      </div>
    )
}

const Connector = ({ isTopWinner, isBottomWinner }: { isTopWinner: boolean, isBottomWinner: boolean }) => {
    const CARD_AND_LABEL_HEIGHT = 92; 
    const GAP = 32;
    const TOTAL_HEIGHT = CARD_AND_LABEL_HEIGHT * 2 + GAP;
    const TEAM_ROW_HEIGHT = 36;
    const LABEL_HEIGHT = 16; 
    
    const topTeamY = LABEL_HEIGHT + (TEAM_ROW_HEIGHT / 2);
    const bottomTeamY = LABEL_HEIGHT + TEAM_ROW_HEIGHT + (TEAM_ROW_HEIGHT / 2) + 1; // +1 for the border

    const startY1 = isTopWinner ? topTeamY : bottomTeamY;
    const startY2 = (CARD_AND_LABEL_HEIGHT + GAP) + (isBottomWinner ? topTeamY : bottomTeamY);

    const endY = TOTAL_HEIGHT / 2;
    
    return (
      <div className="w-8 h-full flex-shrink-0 mx-2" style={{ height: `${TOTAL_HEIGHT}px` }}>
          <svg className="w-full h-full" viewBox={`0 0 32 ${TOTAL_HEIGHT}`} preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d={`M1 ${startY1} C 16,${startY1} 16,${endY} 28,${endY}`} stroke="#FFB74D" strokeWidth="2"/>
              <path d={`M1 ${startY2} C 16,${startY2} 16,${endY} 28,${endY}`} stroke="#FFB74D" strokeWidth="2"/>
              <path d={`M32 ${endY} L28 ${endY-4} L24 ${endY} L28 ${endY+4} Z`} fill="#FFB74D" />
          </svg>
      </div>
    );
};

export default function Bracket({ tournament, bracket, activeRoundName }: { tournament: Tournament, bracket: Round[], activeRoundName: string }) {
  
  const getWinner = (match: Match | null): Team | null => {
      if (!match || match.status !== 'completed' || !match.teams[0] || !match.teams[1]) return null;
      return match.scores[0] > match.scores[1] ? match.teams[0] : match.teams[1];
  };

  const didTopTeamWin = (match: Match | null): boolean => {
    if (!match || match.status !== 'completed' || !match.teams[0] || !match.teams[1]) {
      return true;
    }
    return match.scores[0] > match.scores[1];
  };

  const processedBracket = React.useMemo(() => {
    return processBracketForWinners(bracket);
  }, [bracket]);

  const activeRoundIndex = processedBracket.findIndex(r => r.name === activeRoundName);
  const activeRound = processedBracket[activeRoundIndex];
  const nextRound = processedBracket[activeRoundIndex + 1] || null;

  if (!activeRound) {
    return (
        <div className="text-center py-12">
            <p className="text-muted-foreground">Bracket not available for this tournament.</p>
        </div>
    );
  }

  const matchPairs = [];
  if (activeRound) {
      for (let i = 0; i < activeRound.matches.length; i+=2) {
          matchPairs.push([
              activeRound.matches[i],
              activeRound.matches[i+1] || null
          ])
      }
  }
  
  // Final Round (or any round with just one match)
  if (activeRound.matches.length === 1) {
    const finalMatch = activeRound.matches[0];
    return (
      <div className="flex justify-center">
        <SingleMatchDisplay match={finalMatch} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
        {matchPairs.map((pair, index) => {
            const [match1, match2] = pair;
            const nextMatch = nextRound ? nextRound.matches[index] : null;

            return (
                <div key={index} className="flex items-center w-full justify-center">
                    <div className="space-y-8">
                       <SingleMatchDisplay match={match1} />
                       <SingleMatchDisplay match={match2} />
                    </div>

                    {nextRound && <Connector isTopWinner={didTopTeamWin(match1)} isBottomWinner={didTopTeamWin(match2)} />}

                    {nextRound && (
                        <div className="flex items-center">
                           <SingleMatchDisplay
                                match={nextMatch}
                                highlightTeam1AsWinner={match1?.status === 'completed'}
                                highlightTeam2AsWinner={match2?.status === 'completed'}
                           />
                        </div>
                    )}
                </div>
            )
        })}
    </div>
  );
}
