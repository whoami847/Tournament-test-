
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { PaymentGatewaySettings } from '@/types';

const formSchema = z.object({
  name: z.string().min(2, "Provider name is required."),
  storeId: z.string().min(1, "Store ID is required."),
  storePassword: z.string().min(1, "Store Password is required."),
});

type GatewayFormValues = z.infer<typeof formSchema>;

interface GatewayFormProps {
    settings: Omit<PaymentGatewaySettings, 'id'>;
    onSubmit: (data: GatewayFormValues) => void;
    isSubmitting: boolean;
}

export function GatewayForm({ settings, onSubmit, isSubmitting }: GatewayFormProps) {
    const form = useForm<GatewayFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: settings?.name || 'RupantorPay',
            storeId: settings?.storeId || '',
            storePassword: settings?.storePassword || '',
        },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Provider Name</FormLabel><FormControl><Input placeholder="e.g., RupantorPay" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="storeId" render={({ field }) => (
                    <FormItem><FormLabel>Store ID</FormLabel><FormControl><Input placeholder="Your RupantorPay Store ID" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="storePassword" render={({ field }) => (
                    <FormItem><FormLabel>Store Password</FormLabel><FormControl><Input type="password" placeholder="Your secret store password" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? 'Saving...' : 'Save Settings'}
                </Button>
            </form>
        </Form>
    );
}
