'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Award, KeyRound, Trophy, Users, Ticket, Map as MapIcon, Smartphone, ClipboardCheck, Copy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { getTournamentStream } from '@/lib/tournaments-service';
import type { Tournament, Match, Team, PlayerProfile } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { getUserProfileStream } from '@/lib/users-service';
import { ResultSubmissionDialog } from '@/components/result-submission-dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

const InfoRow = ({ icon: Icon, label, value, index }: { icon: LucideIcon; label: string; value: React.ReactNode; index: number; }) => (
    <motion.div 
        className="flex items-center justify-between py-3 border-b border-border/50 last:border-b-0"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 + (index * 0.05) }}
    >
        <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="text-sm font-semibold text-foreground text-right">{value}</span>
    </motion.div>
);


const getEntryType = (format: string = '') => {
  const type = format.split('_')[1] || '';
  if (!type) return 'N/A';
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

const getTeamSize = (format: string = ''): number => {
    const type = format.split('_')[1]?.toUpperCase() || 'SQUAD';
    if (type === 'SOLO') return 1;
    if (type === 'DUO') return 2;
    if (type === 'SQUAD') return 4;
    return 4; // Default
};

const CopyToClipboard = ({ text, label }: { text: string; label: string }) => {
    const { toast } = useToast();
    const handleCopy = () => {
      navigator.clipboard.writeText(text);
      toast({
        title: `${label} Copied!`,
        description: text,
      });
    };
    return (
      <div className='space-y-1'>
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <Input readOnly value={text} className="bg-muted/50" />
          <Button variant="ghost" size="icon" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
};

export default function TournamentDetailsClient({ initialTournament }: { initialTournament: Tournament }) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [tournament, setTournament] = useState<Tournament>(initialTournament);
  const [isSubmissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [matchForSubmission, setMatchForSubmission] = useState<{match: Match, roundName: string} | null>(null);
  const [teamForSubmission, setTeamForSubmission] = useState<Team | null>(null);
  const [submissionDialogShown, setSubmissionDialogShown] = useState(false);

  useEffect(() => {
    if (user?.uid) {
        getUserProfileStream(user.uid, setProfile);
    } else {
        setProfile(null);
    }
  }, [user]);

  useEffect(() => {
    if (initialTournament.id) {
      const unsubscribe = getTournamentStream(initialTournament.id, (data) => {
        if (data) {
          setTournament(data);
        } else {
          notFound();
        }
      });
      
      return () => unsubscribe();
    }
  }, [initialTournament.id]);

  const userTeam = tournament?.participants.find(p => p.members?.some(m => m.gamerId === (profile as any)?.gamerId));

  const matchesToSubmit = tournament?.bracket.flatMap(round => 
      round.matches
          .map(match => ({ match, roundName: round.name }))
          .filter(({ match }) => {
              const status = match.resultSubmissionStatus?.[userTeam?.id || ''];
              return status === 'pending' && (match.teams[0]?.id === userTeam?.id || match.teams[1]?.id === userTeam?.id);
          })
  ) || [];

  const handleOpenSubmissionDialog = (data: { match: Match; roundName: string }) => {
      if (!userTeam) return;
      setMatchForSubmission(data);
      setTeamForSubmission(userTeam);
      setSubmissionDialogOpen(true);
  }

  useEffect(() => {
    if (matchesToSubmit.length > 0 && !submissionDialogShown) {
      handleOpenSubmissionDialog(matchesToSubmit[0]);
      setSubmissionDialogShown(true);
    }
  }, [matchesToSubmit, submissionDialogShown, handleOpenSubmissionDialog, userTeam]);

  const currentUserMatch = useMemo(() => {
    if (!userTeam || !tournament?.bracket) {
      return null;
    }

    const allUserMatches = tournament.bracket.flatMap(round =>
      round.matches.filter(match =>
        match.teams.some(t => t?.id === userTeam.id)
      )
    );

    const relevantMatch = allUserMatches.find(m => m.status === 'live' && m.roomId) || 
                          allUserMatches.find(m => m.status === 'pending' && m.roomId);

    return relevantMatch || null;
  }, [tournament, userTeam]);

  const isAlreadyJoined = useMemo(() => {
    if (!tournament || !profile) return false;
    return tournament.participants.some(p => p.members?.some(m => m.gamerId === profile.gamerId));
  }, [tournament, profile]);

  const handleJoinClick = () => {
    if (!user || !profile) {
        toast({
            title: "Authentication Required",
            description: "Please log in to join a tournament.",
            variant: "destructive",
        });
        router.push('/login');
        return;
    }

    if (tournament!.entryFee > 0) {
        if (profile.balance < tournament!.entryFee) {
            toast({
                title: "Insufficient Balance",
                description: "Please add funds to your wallet to join this tournament.",
                variant: "destructive",
            });
            router.push('/wallet');
        } else {
            router.push(`/tournaments/${tournament!.id}/join`);
        }
    } else {
        // Free entry
        router.push(`/tournaments/${tournament!.id}/join`);
    }
  };

  const teamSize = getTeamSize(tournament.format);
  const totalPlayerSlots = tournament.maxTeams * teamSize;
  const currentPlayerCount = tournament.participants.reduce((sum, team) => sum + (team.members?.length || 0), 0);
  const isFull = currentPlayerCount >= totalPlayerSlots;
  const joinButtonText = isAlreadyJoined ? 'Already Joined' : (isFull ? 'Full' : 'Join Now');
  const isButtonDisabled = isFull || isAlreadyJoined;

  return (
    <>
    {matchForSubmission && teamForSubmission && (
        <ResultSubmissionDialog
            isOpen={isSubmissionDialogOpen}
            onClose={() => setSubmissionDialogOpen(false)}
            tournament={tournament}
            match={matchForSubmission.match}
            roundName={matchForSubmission.roundName}
            team={teamForSubmission}
        />
    )}
    <div className="container mx-auto px-4 py-8 md:pb-8 pb-24">
      <div className="space-y-8">
        <motion.header
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative h-64 md:h-80 rounded-lg overflow-hidden"
        >
          <Image
            src={tournament.image}
            alt={tournament.name}
            fill
            className="object-cover"
            data-ai-hint={tournament.dataAiHint as string}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 md:p-8">
            <Badge variant="secondary" className="mb-2">{tournament.game}</Badge>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white shadow-lg">{tournament.name}</h1>
          </div>
        </motion.header>

        <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            {matchesToSubmit.length > 0 && (
                <Card className="mb-6 bg-primary/10 border-primary/20">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
                        <ClipboardCheck className="h-8 w-8 text-primary" />
                        <div>
                            <h3 className="font-bold text-foreground">Action Required</h3>
                            <p className="text-sm text-muted-foreground">You have pending match results to submit.</p>
                        </div>
                        <Button 
                            size="sm" 
                            className="ml-auto w-full sm:w-auto"
                            onClick={() => handleOpenSubmissionDialog(matchesToSubmit[0])}
                        >
                            Submit Results
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="info">
                <TabsList className="grid w-full grid-cols-3 bg-card rounded-full p-1 h-auto">
                  <TabsTrigger value="info" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">Info</TabsTrigger>
                  <TabsTrigger value="bracket" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">Bracket</TabsTrigger>
                  <TabsTrigger value="rules" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">Rules</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="mt-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="mb-8">
                          <InfoRow icon={Trophy} label="Total Prize" value={`${tournament.prizePool} TK`} index={0} />
                          <InfoRow icon={Award} label="Per Kill Prize" value={`${tournament.perKillPrize || 0} TK`} index={1} />
                          <InfoRow icon={Ticket} label="Entry Fee" value={tournament.entryFee > 0 ? `${tournament.entryFee} TK` : 'Free'} index={2} />
                          <InfoRow icon={Users} label="Team Format" value={getEntryType(tournament.format)} index={3} />
                          <InfoRow icon={Users} label="Total Squads" value={tournament.maxTeams} index={4} />
                          <InfoRow icon={MapIcon} label="Map" value={tournament.map || 'TBD'} index={5} />
                          <InfoRow icon={Smartphone} label="Game Version" value={tournament.version || 'N/A'} index={6} />
                      </div>


                      <div className="mt-8">
                          <div className="flex items-center gap-4">
                              <div className="w-full">
                                  <Progress 
                                    value={(currentPlayerCount / totalPlayerSlots) * 100} 
                                    indicatorClassName={cn(isFull && "bg-destructive")} 
                                  />
                                  <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                                      <span>{isFull ? 'Registration is closed' : `Only ${totalPlayerSlots - currentPlayerCount} spots are left`}</span>
                                      <span>{currentPlayerCount}/{totalPlayerSlots} Players</span>
                                  </div>
                              </div>
                              {tournament.status === 'upcoming' && (
                                  <Button
                                      onClick={handleJoinClick}
                                      disabled={isButtonDisabled}
                                      className={cn("shrink-0 rounded-full font-bold", isFull && !isAlreadyJoined && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                                  >
                                      {joinButtonText}
                                  </Button>
                              )}
                          </div>
                      </div>

                      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Accordion type="single" collapsible>
                            <AccordionItem value="room-details" className="border-b-0">
                                <AccordionTrigger className="bg-muted hover:no-underline rounded-md px-4 py-2.5 text-sm font-semibold border hover:border-primary/50">
                                    <div className="flex items-center gap-2">
                                        <KeyRound className="h-4 w-4 text-primary" />
                                        Room Details
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 bg-muted/50 rounded-b-md text-sm text-muted-foreground">
                                    {currentUserMatch ? (
                                        <div className="space-y-3">
                                            <CopyToClipboard text={currentUserMatch.roomId!} label="Room ID" />
                                            {currentUserMatch.roomPass && <CopyToClipboard text={currentUserMatch.roomPass} label="Room Password" />}
                                        </div>
                                    ) : (
                                        <p>Room ID and password for your match will be shown here once published by the admin.</p>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        <Accordion type="single" collapsible>
                            <AccordionItem value="prize-details" className="border-b-0">
                                <AccordionTrigger className="bg-muted hover:no-underline rounded-md px-4 py-2.5 text-sm font-semibold border hover:border-primary/50">
                                    <div className="flex items-center gap-2">
                                        <Award className="h-4 w-4 text-primary" />
                                        Total Prize Details
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 bg-muted/50 rounded-b-md text-sm text-muted-foreground">
                                    <ul className="list-disc list-inside space-y-1 font-medium text-foreground/80">
                                        <li>1st Place: {Math.round(parseInt(tournament.prizePool.replace(/,/g, '')) * 0.5)} TK</li>
                                        <li>2nd Place: {Math.round(parseInt(tournament.prizePool.replace(/,/g, '')) * 0.3)} TK</li>
                                        <li>3rd Place: {Math.round(parseInt(tournament.prizePool.replace(/,/g, '')) * 0.2)} TK</li>
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="bracket" className="mt-4">
                    <Card>
                        <CardContent className="text-center py-12">
                             <p className="text-muted-foreground mb-4">The bracket is displayed in a dedicated view for a better experience.</p>
                             <Button asChild size="lg" className="rounded-full">
                                <Link href={`/tournaments/${tournament.id}/bracket`}>View Full Bracket</Link>
                             </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="rules" className="mt-4">
                    <Card>
                        <CardContent className="prose prose-invert prose-p:text-muted-foreground p-6">
                            <p>{tournament.rules}</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </motion.div>
      </div>
    </div>
    </>
  );
}
