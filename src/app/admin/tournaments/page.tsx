
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTournamentsStream, deleteTournament, updateTournament } from '@/lib/tournaments-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, KeyRound } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Tournament } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateMatchDetails } from '@/lib/tournaments-service';

// Helper component for managing rooms within a tournament card
const RoomManager = ({ tournament }: { tournament: Tournament }) => {
    const { toast } = useToast();
    // Use a ref to store input values to avoid re-renders on every keystroke.
    const roomDetailsRef = useRef<Record<string, { roomId: string, roomPass: string }>>({});

    // Pre-fill the ref with existing data when the component mounts or tournament data changes.
    useEffect(() => {
        const initialDetails: Record<string, { roomId: string, roomPass: string }> = {};
        tournament.bracket.forEach(round => {
            round.matches.forEach(match => {
                roomDetailsRef.current[match.id] = {
                    roomId: match.roomId || '',
                    roomPass: match.roomPass || ''
                };
            });
        });
    }, [tournament]);

    const handlePublish = async (matchId: string) => {
        const details = roomDetailsRef.current[matchId];
        if (!details || !details.roomId || !details.roomPass) {
             toast({ title: "Missing Info", description: "Please provide both Room ID and Password.", variant: "destructive" });
             return;
        }
        const result = await updateMatchDetails(tournament.id, matchId, details);
        if (result.success) {
            toast({ title: "Room Details Published", description: `Details for match ${matchId} updated.` });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    if (tournament.bracket.length === 0) {
        return <p className="text-center text-sm text-muted-foreground py-4">No bracket generated for this tournament.</p>;
    }

    return (
        <div className="space-y-3 pt-2">
            {tournament.bracket.map(round => (
                <div key={round.name}>
                    <h4 className="font-semibold text-xs mb-2 text-muted-foreground">{round.name}</h4>
                    <div className="space-y-2">
                        {round.matches.map(match => (
                             <div key={match.id} className="p-3 border rounded-lg bg-background">
                                <p className="text-sm font-medium truncate mb-2">{match.name}</p>
                                <div className="space-y-2">
                                     <div>
                                        <Label htmlFor={`roomId-${match.id}`} className="text-xs">Room ID</Label>
                                        <Input 
                                            id={`roomId-${match.id}`}
                                            placeholder="ID..." 
                                            defaultValue={match.roomId || ''} 
                                            onChange={(e) => {
                                                if(!roomDetailsRef.current[match.id]) roomDetailsRef.current[match.id] = {roomId: '', roomPass: ''};
                                                roomDetailsRef.current[match.id].roomId = e.target.value
                                            }}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                     <div>
                                        <Label htmlFor={`roomPass-${match.id}`} className="text-xs">Password</Label>
                                        <Input 
                                            id={`roomPass-${match.id}`}
                                            placeholder="Pass..." 
                                            defaultValue={match.roomPass || ''}
                                            onChange={(e) => {
                                                if(!roomDetailsRef.current[match.id]) roomDetailsRef.current[match.id] = {roomId: '', roomPass: ''};
                                                roomDetailsRef.current[match.id].roomPass = e.target.value
                                            }}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>
                                <Button size="sm" className="w-full h-8 text-xs mt-2" onClick={() => handlePublish(match.id)}>
                                    Publish
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};


export default function AdminTournamentsPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
    const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = getTournamentsStream((data) => {
            setTournaments(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredTournaments = useMemo(() => {
        if (!tournaments) return [];
        if (selectedStatus === 'all') return tournaments;
        return tournaments.filter((tournament: Tournament) => tournament.status === selectedStatus);
    }, [tournaments, selectedStatus]);

    const handleStatusChange = async (tournamentId: string, tournamentName: string, status: 'live' | 'completed') => {
        const result = await updateTournament(tournamentId, { status });
        if (result.success) {
            toast({
                title: "Status Updated",
                description: `"${tournamentName}" has been updated to ${status}.`,
            });
        } else {
             toast({
                title: "Error",
                description: result.error || "Failed to update status.",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async () => {
        if (!tournamentToDelete) return;
        
        const result = await deleteTournament(tournamentToDelete.id);
        if (result.success) {
            toast({
                title: "Tournament Deleted",
                description: `"${tournamentToDelete.name}" has been successfully deleted.`,
            });
        } else {
             toast({
                title: "Error",
                description: result.error || "Failed to delete tournament.",
                variant: "destructive",
            });
        }
        setTournamentToDelete(null);
    };

    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', className?: string }> = {
      upcoming: { variant: 'secondary' },
      live: { variant: 'destructive' },
      completed: { variant: 'default', className: 'bg-green-500 text-primary-foreground border-transparent hover:bg-green-600' },
    };
    
    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Tournaments</CardTitle>
                        <CardDescription>Manage all tournaments in the app.</CardDescription>
                    </div>
                    <Button asChild size="sm">
                        <Link href="/create-tournament">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Tournament
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <Button variant={selectedStatus === 'all' ? 'default' : 'ghost'} size="sm" className="rounded-full h-8 px-4 capitalize" onClick={() => setSelectedStatus('all')}>All</Button>
                        <Button variant={selectedStatus === 'upcoming' ? 'default' : 'ghost'} size="sm" className="rounded-full h-8 px-4 capitalize" onClick={() => setSelectedStatus('upcoming')}>Upcoming</Button>
                        <Button variant={selectedStatus === 'live' ? 'default' : 'ghost'} size="sm" className="rounded-full h-8 px-4 capitalize" onClick={() => setSelectedStatus('live')}>Live</Button>
                        <Button variant={selectedStatus === 'completed' ? 'default' : 'ghost'} size="sm" className="rounded-full h-8 px-4 capitalize" onClick={() => setSelectedStatus('completed')}>Completed</Button>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                 <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                                    <Skeleton className="h-12 w-1/4" />
                                    <Skeleton className="h-12 w-1/4" />
                                    <Skeleton className="h-12 w-1/4" />
                                    <Skeleton className="h-12 w-1/4" />
                                </div>
                            ))}
                        </div>
                    ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Game</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Participants</TableHead>
                                        <TableHead>Prize Pool</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTournaments.length > 0 ? filteredTournaments.map((tournament) => {
                                        const config = statusConfig[tournament.status] ?? { variant: 'secondary' };
                                        return (
                                        <TableRow 
                                            key={tournament.id} 
                                            onClick={() => router.push(`/admin/tournaments/${tournament.id}/edit`)}
                                            className="cursor-pointer"
                                        >
                                            <TableCell className="font-medium">{tournament.name}</TableCell>
                                            <TableCell>{tournament.game}</TableCell>
                                            <TableCell>
                                                <Badge variant={config.variant} className={`capitalize ${config.className ?? ''}`}>
                                                    {tournament.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{tournament.teamsCount} / {tournament.maxTeams}</TableCell>
                                            <TableCell>{tournament.prizePool} TK</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Toggle menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); router.push(`/admin/tournaments/${tournament.id}/edit`);}}>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); router.push(`/admin/tournaments/${tournament.id}/edit?tab=bracket`);}}>Manage Bracket</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); router.push(`/tournaments/${tournament.id}`);}}>View Details</DropdownMenuItem>
                                                        
                                                        {tournament.status === 'upcoming' && (
                                                            <DropdownMenuItem onSelect={(e) => {e.stopPropagation(); handleStatusChange(tournament.id, tournament.name, 'live')}}>
                                                                Go Live
                                                            </DropdownMenuItem>
                                                        )}
                                                        {tournament.status === 'live' && (
                                                            <DropdownMenuItem onSelect={(e) => {e.stopPropagation(); handleStatusChange(tournament.id, tournament.name, 'completed')}}>
                                                                Mark as Completed
                                                            </DropdownMenuItem>
                                                        )}
                                                        
                                                        {tournament.status !== 'live' && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => {e.stopPropagation(); setTournamentToDelete(tournament)}}>Delete</DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )}) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">
                                                No tournaments found for this status.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card List */}
                        <div className="md:hidden space-y-4">
                            {filteredTournaments.length > 0 ? filteredTournaments.map((tournament) => {
                                const config = statusConfig[tournament.status] ?? { variant: 'secondary' };
                                return (
                                    <Card key={tournament.id} onClick={() => router.push(`/admin/tournaments/${tournament.id}/edit`)} className="cursor-pointer">
                                        <CardContent className="p-4 pb-2">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="font-semibold">{tournament.name}</p>
                                                    <p className="text-sm text-muted-foreground">{tournament.game}</p>
                                                </div>
                                                <Badge variant={config.variant} className={`capitalize ${config.className ?? ''}`}>
                                                    {tournament.status}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                <div>
                                                    <p className="font-medium text-foreground">{tournament.teamsCount} / {tournament.maxTeams}</p>
                                                    <p className="text-xs">Participants</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium text-foreground">{tournament.prizePool} TK</p>
                                                    <p className="text-xs">Prize Pool</p>
                                                </div>
                                            </div>
                                            <Accordion type="single" collapsible className="w-full mt-4">
                                                <AccordionItem value="item-1" className="border-b-0">
                                                    <AccordionTrigger 
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="bg-muted hover:no-underline rounded-md px-4 py-2.5 text-sm font-semibold border hover:border-primary/50"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <KeyRound className="h-4 w-4 text-primary" />
                                                            Manage Rooms
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent 
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-2 bg-muted/50 rounded-b-md text-sm text-muted-foreground"
                                                    >
                                                        <RoomManager tournament={tournament} />
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </CardContent>
                                        <CardFooter className="p-2 border-t flex flex-wrap gap-2">
                                            <Button asChild size="sm" variant="outline" onClick={(e) => e.stopPropagation()}><Link href={`/tournaments/${tournament.id}`}>View</Link></Button>
                                            
                                            {tournament.status === 'upcoming' && (
                                                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStatusChange(tournament.id, tournament.name, 'live')}}>
                                                    Go Live
                                                </Button>
                                            )}
                                            {tournament.status === 'live' && (
                                                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStatusChange(tournament.id, tournament.name, 'completed')}}>
                                                    Mark Completed
                                                </Button>
                                            )}
                                            
                                            {tournament.status !== 'live' && (
                                              <Button size="sm" variant="destructive" className="ml-auto" onClick={(e) => {e.stopPropagation(); setTournamentToDelete(tournament)}}>Delete</Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                            )}) : (
                                <div className="text-center py-16 border border-dashed rounded-lg">
                                    <h3 className="text-xl font-medium">No Tournaments Found</h3>
                                    <p className="text-muted-foreground mt-2">No tournaments match the selected status.</p>
                                </div>
                            )}
                        </div>
                    </>
                    )}
                </CardContent>
            </Card>
            <AlertDialog open={!!tournamentToDelete} onOpenChange={(open) => !open && setTournamentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the tournament "{tournamentToDelete?.name}" and all of its associated data. Player entry fees will be refunded.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
