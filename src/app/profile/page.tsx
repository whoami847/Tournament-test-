
"use client"

import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, User, Gamepad2, Mail, Calendar, Users, Shield, Trophy, Star, Flame, LogOut, Pencil, Check, X, Loader2, UserPlus, LogOut as LeaveIcon, Search, Award, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { signOutUser } from '@/lib/auth-service';
import { useRouter } from 'next/navigation';
import { getUserProfileStream, findUserByGamerId } from '@/lib/users-service';
import type { PlayerProfile, UserTeam, AppNotification, TeamMember, Tournament, Team, Match } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { 
    createTeam, 
    getTeamStream, 
    sendTeamInvite,
    addMemberManually,
    respondToInvite,
    leaveTeam,
    removeMemberFromTeam,
    updateTeamMember
} from '@/lib/teams-service';
import { getNotificationsStream } from '@/lib/notifications-service';
import { getTournamentsStream } from '@/lib/tournaments-service';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ThemeSwitcher } from '@/components/theme-switcher';

// --- SUB-COMPONENTS ---

const InfoItem = ({ icon: Icon, label, value, index }: { icon: LucideIcon, label: string, value: string, index: number }) => (
    <motion.div 
        className="flex items-center gap-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 * index }}
    >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-semibold">{value}</p>
        </div>
    </motion.div>
);

const UserInfo = ({ profile }: { profile: PlayerProfile | null }) => {
    const infoItems = [
        { icon: User, label: "Full Name", value: profile?.name || 'N/A' },
        { icon: Mail, label: "Email", value: profile?.email || 'N/A' },
        { icon: Gamepad2, label: "Game Name", value: profile?.gameName || 'Not Set' },
        { icon: Shield, label: "Gamer ID", value: profile?.gamerId || 'N/A' },
        { icon: Calendar, label: "Joined", value: profile?.joined ? format(new Date(profile.joined), 'PPP') : 'N/A' },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 {infoItems.map((item, index) => (
                    <InfoItem key={item.label} {...item} index={index} />
                ))}
            </CardContent>
        </Card>
    );
};

const TeamInfo = ({ profile }: { profile: PlayerProfile }) => {
    const { toast } = useToast();
    const [team, setTeam] = useState<UserTeam | null>(null);
    const [invites, setInvites] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [isCreateTeamOpen, setCreateTeamOpen] = useState(false);
    const [isAddMemberOpen, setAddMemberOpen] = useState(false);
    const [isEditMemberOpen, setEditMemberOpen] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
    const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
    
    // Form states
    const [newTeamName, setNewTeamName] = useState('');
    const [searchGamerId, setSearchGamerId] = useState('');
    const [manualAddName, setManualAddName] = useState('');
    const [foundUser, setFoundUser] = useState<PlayerProfile | null>(null);
    const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Edit form state
    const [editName, setEditName] = useState('');
    const [editGamerId, setEditGamerId] = useState('');

    useEffect(() => {
        if (!profile.id) return;

        const unsubInvites = getNotificationsStream(profile.id, (notifications) => {
            const pendingInvites = notifications.filter(n => n.type === 'team_invite' && n.status === 'pending');
            setInvites(pendingInvites);
        });

        if (profile.teamId) {
            const unsubTeam = getTeamStream(profile.teamId, (teamData) => {
                setTeam(teamData);
                setLoading(false);
            });
            return () => { unsubTeam(); unsubInvites(); };
        } else {
            setLoading(false);
            setTeam(null);
            return () => unsubInvites();
        }
    }, [profile]);
    
     const openEditDialog = (member: TeamMember) => {
        setMemberToEdit(member);
        setEditName(member.name);
        setEditGamerId(member.gamerId);
        setEditMemberOpen(true);
    };

    const resetAddMemberDialog = () => {
        setSearchGamerId('');
        setManualAddName('');
        setFoundUser(null);
        setSearchStatus('idle');
    }
    
    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) {
            toast({ title: "Error", description: "Please enter a team name.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        const result = await createTeam(profile, newTeamName.trim());
        if (result.success) {
            toast({ title: "Team Created!", description: `Welcome to ${newTeamName.trim()}.` });
            setCreateTeamOpen(false);
            setNewTeamName('');
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSubmitting(false);
    }
    
    const handleFindUser = async () => {
        if (!searchGamerId.trim()) return;
        setSearchStatus('searching');
        setFoundUser(null);
        const userFound = await findUserByGamerId(searchGamerId.trim());
        if (userFound) {
            setFoundUser(userFound);
            setSearchStatus('found');
        } else {
            setSearchStatus('not_found');
        }
    }

    const handleSendInvite = async () => {
        if (!foundUser || !team) return;
        setIsSubmitting(true);
        const result = await sendTeamInvite(profile, foundUser, team);
        if (result.success) {
            toast({ title: "Invite Sent!", description: `Invitation sent to ${foundUser.name}.` });
            setAddMemberOpen(false);
            resetAddMemberDialog();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSubmitting(false);
    }

    const handleAddManually = async () => {
        if (!searchGamerId.trim() || !manualAddName.trim() || !team) return;
        setIsSubmitting(true);
        const result = await addMemberManually(team.id, searchGamerId.trim(), manualAddName.trim());
        if (result.success) {
            toast({ title: "Member Added!", description: `${manualAddName.trim()} has been added to the team.` });
            setAddMemberOpen(false);
            resetAddMemberDialog();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSubmitting(false);
    }
    
    const handleInviteResponse = async (notification: AppNotification, response: 'accepted' | 'rejected') => {
        if (!notification.team?.id || !notification.from?.uid) return;
        setIsSubmitting(true);
        const result = await respondToInvite(notification.id, profile, notification.team.id, response, notification.from.uid);
        if (!result.success) {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        } else {
            toast({ title: `Invite ${response}!`, description: `You have ${response} the invitation to join ${notification.team.name}.` });
        }
        setIsSubmitting(false);
    }
    
    const handleLeaveTeam = async () => {
        if (!team) return;
        if (!window.confirm(`Are you sure you want to leave ${team.name}?`)) return;
        
        setIsSubmitting(true);
        const result = await leaveTeam(profile.id, team.id);
        if (result.success) {
            toast({ title: "You have left the team." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSubmitting(false);
    }
    
    const handleUpdateMember = async () => {
        if (!team || !memberToEdit) return;
        setIsSubmitting(true);
        const result = await updateTeamMember(team.id, memberToEdit.gamerId, { name: editName, gamerId: editGamerId });
        if (result.success) {
            toast({ title: "Member Updated" });
            setEditMemberOpen(false);
            setMemberToEdit(null);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleRemoveMember = async () => {
        if (!team || !memberToRemove) return;
        setIsSubmitting(true);
        const result = await removeMemberFromTeam(team.id, memberToRemove.gamerId);
        if (result.success) {
            toast({ title: "Member Removed" });
            setMemberToRemove(null);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSubmitting(false);
    };


    if (loading) {
        return <Card><CardHeader><CardTitle>My Team</CardTitle></CardHeader><CardContent><p>Loading team info...</p></CardContent></Card>
    }

    if (!team) {
        return (
             <Dialog open={isCreateTeamOpen} onOpenChange={setCreateTeamOpen}>
                <Card>
                    <CardHeader>
                        <CardTitle>My Team</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-muted-foreground mb-4">You are not part of any team yet.</p>
                        <DialogTrigger asChild>
                            <Button>Create a Team</Button>
                        </DialogTrigger>
                    </CardContent>
                </Card>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Your Team</DialogTitle>
                        <DialogDescription>Give your team a name to get started.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="team-name">Team Name</Label>
                            <Input id="team-name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="e.g., Cosmic Knights" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleCreateTeam} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Create Team"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }
    
    const isLeader = team.leaderId === profile.id;

    return (
    <>
    <Card>
        <CardHeader className="flex-row items-center justify-between">
            <CardTitle>My Team</CardTitle>
             <Dialog open={isAddMemberOpen} onOpenChange={(open) => { setAddMemberOpen(open); if (!open) resetAddMemberDialog(); }}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         {isLeader && (
                            <DialogTrigger asChild>
                                <DropdownMenuItem>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    <span>Add Member</span>
                                </DropdownMenuItem>
                            </DialogTrigger>
                        )}
                        {!isLeader && (
                            <DropdownMenuItem onSelect={handleLeaveTeam} disabled={isSubmitting} className="text-destructive focus:text-destructive">
                                <LeaveIcon className="mr-2 h-4 w-4" />
                                <span>Leave Team</span>
                            </DropdownMenuItem>
                        )}
                         {isLeader && team.members.length === 1 && (
                            <DropdownMenuItem onSelect={handleLeaveTeam} disabled={isSubmitting} className="text-destructive focus:text-destructive">
                                <LeaveIcon className="mr-2 h-4 w-4" />
                                <span>Disband Team</span>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Member</DialogTitle>
                        <DialogDescription>Enter a player's Gamer ID to invite or add them to your team.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-2">
                            <Input value={searchGamerId} onChange={e => setSearchGamerId(e.target.value)} placeholder="Enter player's Gamer ID" disabled={searchStatus === 'searching'} />
                            <Button onClick={handleFindUser} disabled={searchStatus === 'searching'}>
                                {searchStatus === 'searching' ? <Loader2 className="animate-spin" /> : <Search />}
                            </Button>
                        </div>

                        {searchStatus === 'found' && foundUser && (
                            <div className="p-3 rounded-md bg-muted flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8"><AvatarImage src={foundUser.avatar} /><AvatarFallback>{foundUser.name.charAt(0)}</AvatarFallback></Avatar>
                                    <div>
                                        <p className="font-semibold">{foundUser.name}</p>
                                        <p className="text-xs text-muted-foreground">{foundUser.gamerId}</p>
                                    </div>
                                </div>
                                <Button size="sm" onClick={handleSendInvite} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : "Send Invite"}</Button>
                            </div>
                        )}

                        {searchStatus === 'not_found' && (
                             <div className="p-3 rounded-md bg-muted/50 border border-dashed text-center space-y-4">
                               <p className="text-sm text-muted-foreground">User not found. You can add them manually with their name. They can link their account later if they sign up with this Gamer ID.</p>
                               <div className="space-y-2 text-left">
                                   <Label htmlFor="manual-name">Gamer Name</Label>
                                   <Input id="manual-name" value={manualAddName} onChange={e => setManualAddName(e.target.value)} placeholder="Enter their in-game name" />
                               </div>
                               <Button onClick={handleAddManually} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : "Add Manually"}</Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
            {invites.length > 0 && (
                <div className="mb-6 space-y-3">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        Pending Invites
                    </h4>
                    {invites.map(invite => (
                        <div key={invite.id} className="flex items-center justify-between rounded-md bg-muted p-2">
                           <p className="text-sm">Invite from <b>{invite.team?.name}</b></p>
                           <div className="flex gap-2">
                                <Button size="icon" className="h-8 w-8 bg-green-500/20 text-green-500 hover:bg-green-500/30" onClick={() => handleInviteResponse(invite, 'accepted')} disabled={isSubmitting}><Check className="h-4 w-4"/></Button>
                                <Button size="icon" className="h-8 w-8 bg-red-500/20 text-red-500 hover:bg-red-500/30" onClick={() => handleInviteResponse(invite, 'rejected')} disabled={isSubmitting}><X className="h-4 w-4" /></Button>
                           </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                    <AvatarImage src={team.avatar} alt={team.name} data-ai-hint={team.dataAiHint} />
                    <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <h3 className="text-2xl font-bold">{team.name}</h3>
                    <p className="font-medium text-primary">{team.members.find(m => m.uid === profile.id)?.role}</p>
                </div>
            </div>
            <div className="mt-6">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Team Members ({team.members.length}/5)
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {team.members.map(member => (
                        <div key={member.uid || member.gamerId} className="flex items-center justify-between rounded-md bg-muted p-2">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={member.avatar} alt={member.name} />
                                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="overflow-hidden">
                                    <p className="font-medium truncate">{member.name}</p>
                                    {!member.uid && <p className="text-xs text-muted-foreground">(Manual Add)</p>}
                                </div>
                            </div>
                             {isLeader && member.uid !== profile.id && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => openEditDialog(member)}>
                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setMemberToRemove(member)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </CardContent>
    </Card>

    {/* Edit Member Dialog */}
    <Dialog open={isEditMemberOpen} onOpenChange={setEditMemberOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Team Member</DialogTitle>
                <DialogDescription>Update the details for {memberToEdit?.name}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-right">Name</Label>
                    <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-gamer-id" className="text-right">Gamer ID</Label>
                    <Input id="edit-gamer-id" value={editGamerId} onChange={(e) => setEditGamerId(e.target.value)} className="col-span-3" disabled={!!memberToEdit?.uid} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditMemberOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateMember} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Save Changes"}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    {/* Remove Member Confirmation */}
    <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently remove {memberToRemove?.name} from the team. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemoveMember} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Remove"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
    );
};

const achievements = [
    { icon: Trophy, title: "Tournament Winner", tournament: "ML Diamond Cup S5", date: "July 2024", color: "text-amber-400" },
    { icon: Star, title: "MVP Award", tournament: "Summer Skirmish", date: "July 2024", color: "text-blue-400" },
    { icon: Flame, title: "Top Fragger", tournament: "CODM Battle Arena", date: "July 2024", color: "text-red-400" },
];

const Achievements = () => (
    <Card>
        <CardHeader>
            <CardTitle>Top Achievements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {achievements.map((ach, index) => (
                <div key={index} className="flex items-center gap-4 rounded-lg bg-muted p-4">
                    <div className="flex h-12 w-12 items-center justify-center">
                        <ach.icon className={`h-8 w-8 ${ach.color}`} />
                    </div>
                    <div>
                        <p className="font-bold">{ach.title}</p>
                        <p className="text-sm text-muted-foreground">{ach.tournament} &bull; {ach.date}</p>
                    </div>
                </div>
            ))}
        </CardContent>
    </Card>
);

const MatchCard = ({ match, tournament, userTeam }: { match: Match, tournament: Tournament, userTeam: Team }) => {
    if (!match.teams[0] || !match.teams[1]) return null; // Can't display match without both teams

    const { teams, scores, status } = match;
    const [team1, team2] = teams;

    let result: 'Victory' | 'Defeat' | 'Live' | 'Draw' = 'Live';
    let isUserTeam1 = team1.id === userTeam.id;

    if (status === 'completed') {
        if (scores[0] > scores[1]) {
            result = isUserTeam1 ? 'Victory' : 'Defeat';
        } else if (scores[1] > scores[0]) {
            result = !isUserTeam1 ? 'Victory' : 'Defeat';
        } else {
            result = 'Draw';
        }
    }

    const badgeClasses = 
        result === 'Victory' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
        result === 'Defeat' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
        result === 'Live' ? 'bg-primary/20 text-primary border-primary/30' :
        'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30';
    
    const score1Color = status === 'completed' && scores[0] > scores[1] ? 'text-green-400' : 'text-foreground';
    const score2Color = status === 'completed' && scores[1] > scores[0] ? 'text-green-400' : 'text-foreground';

    const TeamDisplay = ({ team }: { team: Team }) => (
        <div className="flex flex-col items-center gap-2 w-24 text-center">
            <Avatar className="h-10 w-10">
                <AvatarImage src={team.avatar} alt={team.name} data-ai-hint="team logo" />
                <AvatarFallback>{team.name?.charAt(0) || 'T'}</AvatarFallback>
            </Avatar>
            <p className="font-semibold text-sm truncate">{team.name}</p>
        </div>
    );

    return (
        <Card className="bg-card/70 p-4">
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">{tournament.name} • {tournament.game}</p>
                <Badge variant="outline" className={badgeClasses}>{result}</Badge>
            </div>
            <div className="flex justify-around items-center">
                <TeamDisplay team={team1} />
                <div className="text-center">
                    {status === 'live' ? (
                        <p className="text-sm font-bold text-primary animate-pulse">LIVE</p>
                    ) : (
                        <p className="text-4xl font-bold">
                            <span className={score1Color}>{scores[0]}</span>
                            <span className="text-2xl text-muted-foreground mx-2">vs</span>
                            <span className={score2Color}>{scores[1]}</span>
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{format(new Date(tournament.startDate), 'dd.MM.yyyy')}</p>
                </div>
                <TeamDisplay team={team2} />
            </div>
        </Card>
    );
};

const MatchHistory = ({ profile }: { profile: PlayerProfile }) => {
    const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = getTournamentsStream((data) => {
            setAllTournaments(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const { liveMatches, completedMatches, userTeamMap } = useMemo(() => {
        if (!profile?.gamerId) return { liveMatches: [], completedMatches: [], userTeamMap: new Map() };

        const live: { match: Match; tournament: Tournament }[] = [];
        const completed: { match: Match; tournament: Tournament }[] = [];
        const teamMap = new Map<string, Team>();

        for (const t of allTournaments) {
            const userTeam = t.participants.find(p => p.members?.some(m => m.gamerId === profile.gamerId));
            if (!userTeam) continue;
            
            teamMap.set(t.id, userTeam);

            t.bracket.forEach(round => {
                round.matches.forEach(match => {
                    if (match.teams.some(team => team?.id === userTeam.id)) {
                        if (match.status === 'live') {
                            live.push({ match, tournament: t });
                        } else if (match.status === 'completed') {
                            completed.push({ match, tournament: t });
                        }
                    }
                });
            });
        }
        
        completed.sort((a, b) => new Date(b.tournament.startDate).getTime() - new Date(a.tournament.startDate).getTime());

        return { liveMatches: live, completedMatches: completed, userTeamMap: teamMap };
    }, [allTournaments, profile]);

    if (loading) {
        return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (liveMatches.length === 0 && completedMatches.length === 0) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    You haven't participated in any matches yet.
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className="space-y-6">
            {liveMatches.length > 0 && (
                <section>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        En live
                    </h3>
                    <div className="space-y-4">
                        {liveMatches.map(({ match, tournament }) => (
                            <MatchCard key={match.id} match={match} tournament={tournament} userTeam={userTeamMap.get(tournament.id)!} />
                        ))}
                    </div>
                </section>
            )}

            {completedMatches.length > 0 && (
                <section>
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold">Les matchs récents</h3>
                        <span className="text-sm text-muted-foreground">{completedMatches.length} matchs</span>
                    </div>
                    <div className="space-y-4">
                        {completedMatches.map(({ match, tournament }) => (
                            <MatchCard key={match.id} match={match} tournament={tournament} userTeam={userTeamMap.get(tournament.id)!} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};


export default function ProfilePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<PlayerProfile | null>(null);

    useEffect(() => {
        if (user?.uid) {
            const unsubscribe = getUserProfileStream(user.uid, (data) => {
                setProfile(data);
            });
            return () => unsubscribe();
        }
    }, [user]);

    const handleLogout = async () => {
        await signOutUser();
        router.push('/login');
    };
    
    if (!profile) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Player';
    const fallback = displayName.charAt(0).toUpperCase();

    return (
        <div className="pb-24">
            <div className="relative h-48 w-full">
                <Image
                    src={profile?.banner || "https://placehold.co/800x300.png"}
                    alt="Profile banner"
                    data-ai-hint="abstract background"
                    fill
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                <div className="absolute top-4 right-4 left-4 z-10 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-white">Profile</h1>
                    <div className="flex items-center gap-2">
                        <ThemeSwitcher />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="bg-black/20 hover:bg-black/40 text-white hover:text-white rounded-full">
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href="/profile/edit" className="flex items-center gap-2">
                                      <Pencil className="h-4 w-4" />
                                      <span>Edit Profile</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center gap-2">
                                    <LogOut className="h-4 w-4" />
                                    <span>Log Out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            <div className="relative z-10 -mt-16 flex flex-col items-center text-center px-4">
                <div className="relative">
                    <Avatar className="h-28 w-28 border-4 border-background">
                        <AvatarImage src={profile?.avatar || user?.photoURL || ''} alt={displayName} />
                        <AvatarFallback>{fallback}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-1 right-1 h-5 w-5 bg-teal-400 rounded-full border-2 border-background" />
                </div>
                <h2 className="mt-3 text-3xl font-bold">{displayName}</h2>
                <p className="text-muted-foreground">Player</p>
            </div>
            
            <div className="px-4 mt-6">
                <Tabs defaultValue="info" className="w-full">
                    <TabsList className="flex w-full justify-start gap-2 overflow-x-auto rounded-full border bg-card p-1 sm:justify-center no-scrollbar">
                        <TabsTrigger value="info" className="shrink-0 rounded-full bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">Information</TabsTrigger>
                        <TabsTrigger value="team" className="shrink-0 rounded-full bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">Team</TabsTrigger>
                        <TabsTrigger value="history" className="shrink-0 rounded-full bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">Match History</TabsTrigger>
                        <TabsTrigger value="success" className="shrink-0 rounded-full bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">Achievements</TabsTrigger>
                    </TabsList>
                    <TabsContent value="info" className="mt-4">
                        <UserInfo profile={profile} />
                    </TabsContent>
                    <TabsContent value="team" className="mt-4">
                        <TeamInfo profile={profile} />
                    </TabsContent>
                    <TabsContent value="history" className="mt-4">
                        <MatchHistory profile={profile} />
                    </TabsContent>
                    <TabsContent value="success" className="mt-4">
                        <Achievements />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
