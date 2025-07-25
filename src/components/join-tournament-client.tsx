
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useParams, notFound, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { User, Users, Shield, ArrowLeft, CheckCircle } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { getTournament, joinTournament } from '@/lib/tournaments-service';
import type { Tournament, Team, PlayerProfile, UserTeam, TeamMember } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { getUserProfileStream } from '@/lib/users-service';
import Link from 'next/link';
import { getTeamStream } from '@/lib/teams-service';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from '@/components/ui/label';

const playerSchema = z.object({
  name: z.string().min(1, { message: "Player name is required." }),
  id: z.string().min(1, { message: "Player ID is required." }),
  uid: z.string().optional(),
});

const formSchema = z.object({
  teamName: z.string().optional(),
  players: z.array(playerSchema).min(1, "At least one player is required."),
});

type JoinType = 'SOLO' | 'DUO' | 'SQUAD';

const getTeamSize = (type: JoinType): number => {
  if (type === 'SOLO') return 1;
  if (type === 'DUO') return 2;
  if (type === 'SQUAD') return 4;
  return 4; // Default
};

const JoinPageSkeleton = () => (
    <div className="container mx-auto px-4 py-8 md:pb-8 pb-24 animate-pulse">
        <Card className="max-w-4xl mx-auto">
            <CardHeader className="text-center">
                <Skeleton className="h-9 w-3/4 mx-auto" />
                <Skeleton className="h-6 w-1/2 mx-auto mt-2" />
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-4">
                    <Skeleton className="h-6 w-1/3 mx-auto" />
                    <Skeleton className="h-4 w-2/3 mx-auto" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-28 w-full" />
                    </div>
                </div>
                <Skeleton className="h-px w-full" />
                <div className="space-y-6">
                    <Skeleton className="h-8 w-1/3 mx-auto" />
                    <div className="p-4 border rounded-lg bg-background shadow-sm relative">
                        <Skeleton className="h-5 w-16 absolute -top-3 left-4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                           <div>
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-10 w-full" />
                           </div>
                           <div>
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-10 w-full" />
                           </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-center">
                    <Skeleton className="h-12 w-48" />
                </div>
            </CardContent>
        </Card>
    </div>
);


export default function JoinTournamentClient() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [team, setTeam] = useState<UserTeam | null>(null);
    const [tournament, setTournament] = useState<Tournament | null>(null);
    
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAlreadyJoined, setIsAlreadyJoined] = useState(false);
    
    const [selectedJoinType, setSelectedJoinType] = useState<JoinType>('SQUAD');

    // Fetch tournament data
    useEffect(() => {
        if (params.id) {
            const fetchTournament = async () => {
                const data = await getTournament(params.id);
                if (data) {
                    setTournament(data);
                    const formatType = data.format.split('_')[1]?.toUpperCase() as JoinType || 'SQUAD';
                    setSelectedJoinType(formatType);
                } else {
                    notFound();
                }
            };
            fetchTournament();
        }
    }, [params.id]);

    // Fetch user profile
    useEffect(() => {
        if (user?.uid) {
            const unsubscribe = getUserProfileStream(user.uid, setProfile);
            return () => unsubscribe();
        }
    }, [user]);

    // Fetch user's team data
    useEffect(() => {
        if (profile?.teamId) {
            const unsubscribe = getTeamStream(profile.teamId, setTeam);
            return () => unsubscribe();
        }
    }, [profile?.teamId]);

    // Set loading state
    useEffect(() => {
        if (tournament && profile) {
            setLoading(false);
        }
    }, [tournament, profile]);
    
    // Check if user has already joined
    useEffect(() => {
        if (tournament && profile) {
            const joined = tournament.participants.some(p => 
                p.members?.some(m => m.gamerId === profile.gamerId)
            );
            setIsAlreadyJoined(joined);
        }
    }, [tournament, profile]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            teamName: '',
            players: [],
        },
    });

    const { fields, replace } = useFieldArray({
        control: form.control,
        name: "players",
    });

    // Effect to set the number of player fields based on tournament type
    useEffect(() => {
        const requiredTeamSize = getTeamSize(selectedJoinType);
        const currentPlayers = form.getValues('players');
        const newPlayers = Array.from({ length: requiredTeamSize }, (_, i) => 
            currentPlayers[i] || { name: '', id: '' }
        );
        replace(newPlayers);
        
        // Always pre-fill player 1 with the logged-in user's info
        if (profile) {
            form.setValue('players.0.name', profile.gameName && profile.gameName !== 'Not Set' ? profile.gameName : profile.name);
            form.setValue('players.0.id', profile.gamerId);
            form.setValue('players.0.uid', profile.id);
        }
    }, [selectedJoinType, profile, replace, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!tournament || !profile || !user) return;
        setIsSubmitting(true);

        const newParticipant: Team = {
            id: `team-${Date.now()}`,
            name: values.teamName || team?.name || `Team ${profile.name}`,
            avatar: team?.avatar || profile.avatar,
            dataAiHint: 'team logo',
            members: values.players.map(p => ({ name: p.name, gamerId: p.id })),
        };

        const result = await joinTournament(tournament.id, newParticipant, user.uid);

        if (result.success) {
            toast({
                title: "Registration Submitted!",
                description: `You have successfully joined "${tournament.name}".`,
            });
            router.push(`/tournaments/${tournament.id}`);
        } else {
            toast({
                title: "Registration Failed",
                description: result.error || "An unexpected error occurred.",
                variant: "destructive",
            });
        }
        setIsSubmitting(false);
    }

    const renderPlayerSlot = (index: number) => {
        const isLeaderSlot = index === 0;
        const [popoverOpen, setPopoverOpen] = useState(false);

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <FormField control={form.control} name={`players.${index}.name`} render={({ field }) => (
                    <FormItem>
                        <FormLabel>Gamer Name</FormLabel>
                        <FormControl><Input placeholder="Enter in-game name" {...field} disabled={isLeaderSlot} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name={`players.${index}.id`} render={({ field }) => (
                     <FormItem className="flex flex-col">
                        <FormLabel>Gamer ID</FormLabel>
                        <div className="flex gap-2">
                            <FormControl><Input placeholder="Enter in-game ID" {...field} disabled={isLeaderSlot} /></FormControl>
                            {!isLeaderSlot && team && team.members.length > 1 && (
                                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" type="button">Select Player</Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search player..." />
                                        <CommandEmpty>No player found.</CommandEmpty>
                                        <CommandGroup>
                                        {team.members
                                            .filter(m => m.uid !== profile?.id)
                                            .map((member) => (
                                            <CommandItem
                                                key={member.gamerId}
                                                value={member.name}
                                                onSelect={() => {
                                                    form.setValue(`players.${index}.name`, member.name);
                                                    form.setValue(`players.${index}.id`, member.gamerId);
                                                    form.setValue(`players.${index}.uid`, member.uid);
                                                    form.trigger([`players.${index}.name`, `players.${index}.id`]);
                                                    setPopoverOpen(false);
                                                }}
                                            >
                                                {member.name}
                                            </CommandItem>
                                        ))}
                                        </CommandGroup>
                                    </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>
        )
    }

    const joinOptions = useMemo(() => {
        if (!tournament) return [];
        const formatType = tournament.format.split('_')[1]?.toUpperCase() || 'SQUAD';
        if (formatType === 'SOLO') return ['SOLO'];
        if (formatType === 'DUO') return ['SOLO', 'DUO'];
        return ['SOLO', 'DUO', 'SQUAD'];
    }, [tournament]);

    if (loading) {
        return <JoinPageSkeleton />;
    }

    if (isAlreadyJoined) {
        return (
            <div className="container mx-auto px-4 py-8 md:pb-8 pb-24 flex items-center justify-center min-h-[60vh]">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto w-fit mb-4">
                            <CheckCircle className="h-12 w-12 text-green-500" />
                        </div>
                        <CardTitle>Already Registered</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription className="mb-6">You have already joined this tournament. You can view your team's status on the tournament page.</CardDescription>
                        <Button asChild>
                            <Link href={`/tournaments/${tournament?.id}`}>Back to Tournament</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!tournament) {
        notFound();
    }

    const showTeamNameInput = getTeamSize(selectedJoinType) > 1;

    return (
        <div className="container mx-auto px-4 py-8 md:pb-8 pb-24">
             <div className="relative">
                <Button variant="outline" size="icon" className="absolute -top-4 -left-2" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
            </div>
            <Card className="max-w-4xl mx-auto">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Register for Tournament</CardTitle>
                    <CardDescription className="text-base">
                        You are registering for: <span className="font-semibold text-primary">{tournament.name}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            
                            <div className="space-y-2">
                                <Label className="text-center block">Join as</Label>
                                <ToggleGroup type="single" value={selectedJoinType} onValueChange={(value: JoinType) => value && setSelectedJoinType(value)} className="justify-center">
                                    {joinOptions.includes('SOLO') && <ToggleGroupItem value="SOLO" aria-label="Join as Solo">Solo</ToggleGroupItem>}
                                    {joinOptions.includes('DUO') && <ToggleGroupItem value="DUO" aria-label="Join as Duo">Duo</ToggleGroupItem>}
                                    {joinOptions.includes('SQUAD') && <ToggleGroupItem value="SQUAD" aria-label="Join as Squad">Squad</ToggleGroupItem>}
                                </ToggleGroup>
                            </div>

                            {showTeamNameInput && (
                                <FormField
                                    control={form.control}
                                    name="teamName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Team Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter your team name (optional)" {...field} defaultValue={team?.name || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            
                            <Separator />
                            
                            <div className="space-y-6">
                                <h3 className="font-semibold text-xl text-center">Player Information ({getTeamSize(selectedJoinType)} Player{getTeamSize(selectedJoinType) > 1 ? 's' : ''})</h3>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="p-4 border rounded-lg bg-background shadow-sm relative">
                                        <span className="absolute -top-3 left-4 bg-background px-1 text-sm text-muted-foreground">{index === 0 ? 'You (Player 1)' : `Player ${index + 1}`}</span>
                                        {renderPlayerSlot(index)}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex justify-center">
                                <Button type="submit" size="lg" disabled={isSubmitting}>
                                    {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
