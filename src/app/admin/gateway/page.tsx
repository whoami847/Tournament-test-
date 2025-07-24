
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { GatewayForm } from '@/components/admin/gateway-form';
import { getGatewaySettings, updateGatewaySettings } from '@/lib/gateway-service';
import type { PaymentGatewaySettings } from '@/types';

export default function AdminGatewayPage() {
    const [settings, setSettings] = useState<Omit<PaymentGatewaySettings, 'id'> | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            const data = await getGatewaySettings();
            setSettings(data);
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleFormSubmit = async (data: Omit<PaymentGatewaySettings, 'id'>) => {
        setIsSubmitting(true);
        const result = await updateGatewaySettings(data);

        if (result.success) {
            toast({
                title: "Gateway Settings Updated!",
                description: `The settings for ${data.name} have been successfully saved.`,
            });
            // Refetch settings after update
            const updatedSettings = await getGatewaySettings();
            setSettings(updatedSettings);
            setIsDialogOpen(false);
        } else {
            toast({
                title: "Error",
                description: result.error || "An unexpected error occurred.",
                variant: "destructive",
            });
        }
        setIsSubmitting(false);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Payment Gateway Settings</CardTitle>
                    <CardDescription>Manage your RupantorPay payment gateway configuration.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            Edit Gateway
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Payment Gateway</DialogTitle>
                            <DialogDescription>
                                Update the API details for your payment provider.
                            </DialogDescription>
                        </DialogHeader>
                        {loading ? <p>Loading form...</p> : (
                            <GatewayForm 
                                settings={settings!}
                                onSubmit={handleFormSubmit}
                                isSubmitting={isSubmitting}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-1/3" />
                        <Skeleton className="h-8 w-2/3" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                ) : settings ? (
                    <div className="space-y-6 text-sm">
                        <div className="flex flex-col gap-1 md:grid md:grid-cols-3 md:items-center md:gap-4">
                            <span className="font-medium text-muted-foreground">Provider Name</span>
                            <span className="md:col-span-2 font-semibold">{settings.name || 'Not Set'}</span>
                        </div>
                         <div className="flex flex-col gap-1 md:grid md:grid-cols-3 md:items-center md:gap-4">
                            <span className="font-medium text-muted-foreground">Store ID</span>
                            <span className="md:col-span-2 font-mono text-xs bg-muted p-2 rounded-md break-all">
                                {settings.storeId || 'Not Set'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 md:grid md:grid-cols-3 md:items-center md:gap-4">
                            <span className="font-medium text-muted-foreground">Store Password</span>
                            <span className="md:col-span-2 font-mono text-xs bg-muted p-2 rounded-md break-all">
                                {settings.storePassword ? '••••••••' + settings.storePassword.slice(-4) : 'Not Set'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <p className="text-muted-foreground">Could not load gateway settings.</p>
                )}
            </CardContent>
        </Card>
    );
}
