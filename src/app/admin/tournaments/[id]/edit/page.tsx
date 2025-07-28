'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, notFound, useRouter, useSearchParams } from 'next/navigation';
import { getTournament, updateTournament, getTournaments } from '@/lib/tournaments-service';
import type { Tournament } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { EditInfoForm } from '@/components/admin/edit-info-form';
import { EditRulesForm } from '@/components/admin/edit-rules-form';
import { BracketEditor } from '@/components/admin/bracket-editor';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EditPointsForm } from '@/components/admin/edit-points-form';

const EditTournamentPageSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
            <Skeleton className="h-7 w-7 rounded-md" />
            <div>
                <Skeleton className="h-7 w-48 mb-2 rounded-md" />
                <Skeleton className="h-5 w-64 rounded-md" />
            </div>
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/3 rounded-md" />
                <Skeleton className="h-4 w-2/3 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
            </CardContent>
        </Card>
    </div>
);

export default function EditTournamentPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'info');

    const fetchTournament = useCallback(async () => {
        if (params.id) {
            setLoading(true);
            const data = await getTournament(params.id as string);
            if (data) {
                setTournament(data);
            } else {
                notFound();
            }
            setLoading(false);
        }
    }, [params.id]);


    useEffect(() => {
        fetchTournament();
    }, [fetchTournament]);


    const handleSave = async (updatedData: Partial<Tournament>) => {
        if (!tournament) return;
        const result = await updateTournament(tournament.id, updatedData);
        if(result.success) {
            // Optimistic update
            setTournament(prev => prev ? { ...prev, ...updatedData } : null);
            toast({
                title: "Changes Saved!",
                description: "The tournament details have been updated.",
            });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };
    
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    if (loading) {
        return <EditTournamentPageSkeleton />;
    }

    if (!tournament) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Edit Tournament</h1>
                    <p className="text-muted-foreground">Editing: {tournament.name}</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="info">Info</TabsTrigger>
                    <TabsTrigger value="rules">Rules</TabsTrigger>
                    <TabsTrigger value="bracket">Bracket</TabsTrigger>
                    <TabsTrigger value="points">Points</TabsTrigger>
                </TabsList>
                <TabsContent value="info">
                    <Card>
                        <CardHeader>
                            <CardTitle>Edit Information</CardTitle>
                            <CardDescription>Update the general details of the tournament.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EditInfoForm tournament={tournament} onSave={handleSave} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="rules">
                    <Card>
                        <CardHeader>
                            <CardTitle>Edit Rules</CardTitle>
                            <CardDescription>Update the tournament rules and regulations.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EditRulesForm tournament={tournament} onSave={handleSave} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="bracket">
                    <BracketEditor 
                        tournamentId={tournament.id}
                        bracket={tournament.bracket} 
                        participants={tournament.participants}
                        pointSystemEnabled={tournament.pointSystemEnabled ?? false}
                        onUpdate={fetchTournament}
                    />
                </TabsContent>
                <TabsContent value="points">
                    <Card>
                        <CardHeader>
                            <CardTitle>Point System</CardTitle>
                            <CardDescription>Define the scoring system for placement and kills.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EditPointsForm tournament={tournament} onSave={handleSave} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
