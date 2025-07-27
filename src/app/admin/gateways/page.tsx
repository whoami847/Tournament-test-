
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

const nagorikPaySchema = z.object({
    accessToken: z.string().min(1, 'API Key is required.'),
    successUrl: z.string().url('Invalid URL.').min(1, 'Success URL is required.'),
    cancelUrl: z.string().url('Invalid URL.').min(1, 'Cancel URL is required.'),
    webhookUrl: z.string().optional(),
});

const formSchema = z.object({
  nagorikPay: nagorikPaySchema,
});

type GatewaySettingsFormValues = z.infer<typeof formSchema>;

export default function AdminGatewaySettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<GatewaySettingsFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nagorikPay: {
                accessToken: '',
                successUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/payment/verify`,
                cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/payment/verify`,
                webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhook`,
            },
        },
    });

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const settings = await getGatewaySettings();
            if (settings && settings.nagorikPay) {
                form.reset({ nagorikPay: settings.nagorikPay });
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
                        <Tabs defaultValue="nagorikpay" className="w-full">
                            <TabsList>
                                <TabsTrigger value="nagorikpay">NagorikPay</TabsTrigger>
                            </TabsList>
                            <TabsContent value="nagorikpay" className="pt-6">
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="nagorikPay.accessToken"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>API Key</FormLabel>
                                                <FormControl><Input placeholder="Enter your NagorikPay API Key" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="nagorikPay.successUrl"
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
                                        name="nagorikPay.cancelUrl"
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
                                        name="nagorikPay.webhookUrl"
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
