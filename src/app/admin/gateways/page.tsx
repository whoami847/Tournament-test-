
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getGatewaySettings, saveGatewaySettings } from '@/lib/gateway-settings-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const rupantorPaySchema = z.object({
    accessToken: z.string().min(1, 'Access Token (API Key) is required.'),
    successUrl: z.string().url('Invalid URL.').min(1, 'Success URL is required.'),
    cancelUrl: z.string().url('Invalid URL.').min(1, 'Cancel URL is required.'),
    failUrl: z.string().url('Invalid URL.').min(1, 'Fail URL is required.'),
    webhookUrl: z.string().optional(),
});

const formSchema = z.object({
  rupantorPay: rupantorPaySchema,
});

type GatewaySettingsFormValues = z.infer<typeof formSchema>;

export default function AdminGatewaySettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<GatewaySettingsFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            rupantorPay: {
                accessToken: '',
                successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/verify`,
                cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/verify`,
                failUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/verify`,
                webhookUrl: '',
            },
        },
    });

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const settings = await getGatewaySettings();
            if (settings && settings.rupantorPay) {
                // Map old apiKey to new accessToken for backward compatibility
                const mappedSettings = {
                    ...settings.rupantorPay,
                    accessToken: settings.rupantorPay.accessToken || (settings.rupantorPay as any).apiKey || '',
                };
                form.reset({ rupantorPay: mappedSettings });
            }
            setLoading(false);
        };
        fetchSettings();
    }, [form]);

    const onSubmit = async (data: GatewaySettingsFormValues) => {
        setIsSubmitting(true);
        const result = await saveGatewaySettings(data);
        if (result.success) {
            toast({
                title: 'Settings Saved!',
                description: 'Your gateway settings have been updated.',
            });
        } else {
            toast({
                title: 'Error',
                description: result.error || 'Failed to save settings.',
                variant: 'destructive',
            });
        }
        setIsSubmitting(false);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment Gateway Settings</CardTitle>
                <CardDescription>Configure the payment gateways for your application.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Tabs defaultValue="rupantorpay" className="w-full">
                            <TabsList>
                                <TabsTrigger value="rupantorpay">RupantorPay</TabsTrigger>
                            </TabsList>
                            <TabsContent value="rupantorpay" className="pt-6">
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="rupantorPay.accessToken"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Access Token (API Key)</FormLabel>
                                                <FormControl><Input placeholder="Enter your RupantorPay Access Token" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="rupantorPay.successUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Success URL</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="rupantorPay.cancelUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cancel URL</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="rupantorPay.failUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fail URL</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="rupantorPay.webhookUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Webhook URL (Optional)</FormLabel>
                                                <FormControl><Input placeholder="Your server-to-server webhook URL" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Settings
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
