
'use client';

import { useState, useEffect } from 'react';
import type { TopupRequest } from '@/types';
import { getTopupRequestsStream, processTopupRequest } from '@/lib/topup-requests-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, XCircle } from 'lucide-react';

export default function AdminTopupRequestsPage() {
    const [requests, setRequests] = useState<TopupRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = getTopupRequestsStream((data) => {
            setRequests(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleProcessRequest = async (requestId: string, status: 'approved' | 'rejected') => {
        const result = await processTopupRequest(requestId, status);
        if (result.success) {
            toast({ title: `Request ${status} successfully.` });
            // Re-fetch or let the stream handle the update
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top-up Requests</CardTitle>
                <CardDescription>Approve or reject user top-up requests.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => ( <Skeleton key={i} className="h-16 w-full" /> ))}
                    </div>
                ) : requests.length > 0 ? (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Transaction ID</TableHead>
                                        <TableHead>Requested</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell>
                                                <div className="font-medium">{req.userName}</div>
                                                <div className="text-sm text-muted-foreground">{req.userGamerId}</div>
                                            </TableCell>
                                            <TableCell>{req.amount} TK</TableCell>
                                            <TableCell>{req.method}</TableCell>
                                            <TableCell className="font-mono text-xs">{req.transactionId}</TableCell>
                                            <TableCell>{formatDistanceToNow(new Date(req.requestedAt as string), { addSuffix: true })}</TableCell>
                                            <TableCell className="flex gap-2">
                                                <Button size="icon" variant="outline" className="text-green-500" onClick={() => handleProcessRequest(req.id, 'approved')}>
                                                    <CheckCircle className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="destructive" onClick={() => handleProcessRequest(req.id, 'rejected')}>
                                                    <XCircle className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        
                        {/* Mobile Card List */}
                        <div className="md:hidden space-y-4">
                            {requests.map((req) => (
                                <div key={req.id} className="bg-muted/50 p-4 rounded-lg border">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="font-semibold">{req.userName}</p>
                                            <p className="text-sm text-muted-foreground">{req.userGamerId}</p>
                                        </div>
                                        <p className="font-bold text-primary">{req.amount} TK</p>
                                    </div>
                                    
                                    <div className="space-y-1 mb-4 text-sm border-t border-b py-3">
                                        <p><span className="font-medium text-muted-foreground w-24 inline-block">Method:</span> {req.method}</p>
                                        <p><span className="font-medium text-muted-foreground w-24 inline-block">Trx ID:</span> <span className="font-mono text-xs">{req.transactionId}</span></p>
                                    </div>
                                
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(req.requestedAt as string), { addSuffix: true })}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" className="text-green-500" onClick={() => handleProcessRequest(req.id, 'approved')}>
                                                <CheckCircle className="h-4 w-4" />
                                                Approve
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleProcessRequest(req.id, 'rejected')}>
                                                <XCircle className="h-4 w-4" />
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-16 border border-dashed rounded-lg">
                        <h3 className="text-xl font-medium">No Pending Requests</h3>
                        <p className="text-muted-foreground mt-2">All caught up! New requests will appear here.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
