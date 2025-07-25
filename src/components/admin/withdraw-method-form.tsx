
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { WithdrawMethod } from '@/types';
import { ImageUpload } from './image-upload';

const formSchema = z.object({
  name: z.string().min(2, "Method name is required."),
  image: z.string().url("Please upload an icon for the method."),
  feePercentage: z.coerce.number().min(0).max(100),
  minAmount: z.coerce.number().min(0),
  maxAmount: z.coerce.number().min(1),
  status: z.enum(['active', 'inactive']),
}).refine(data => data.maxAmount > data.minAmount, {
    message: "Max amount must be greater than min amount.",
    path: ["maxAmount"],
});

type FormValues = z.infer<typeof formSchema>;

interface WithdrawMethodFormProps {
    method?: WithdrawMethod;
    onSubmit: (data: FormValues) => void;
    isSubmitting: boolean;
}

export function WithdrawMethodForm({ method, onSubmit, isSubmitting }: WithdrawMethodFormProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: method?.name || '',
            image: method?.image || '',
            feePercentage: method?.feePercentage || 0,
            minAmount: method?.minAmount || 50,
            maxAmount: method?.maxAmount || 5000,
            status: method?.status || 'active',
        },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Method Icon</FormLabel>
                            <FormControl>
                                <ImageUpload
                                    initialImageUrl={field.value}
                                    onUploadComplete={(url) => form.setValue('image', url, { shouldValidate: true })}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Method Name</FormLabel><FormControl><Input placeholder="e.g., bKash" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="feePercentage" render={({ field }) => (
                      <FormItem><FormLabel>Fee (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="minAmount" render={({ field }) => (
                      <FormItem><FormLabel>Min Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                 <FormField control={form.control} name="maxAmount" render={({ field }) => (
                      <FormItem><FormLabel>Max Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                 <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                            <FormLabel>Status: {field.value === 'active' ? 'Active' : 'Inactive'}</FormLabel>
                        </div>
                        <FormControl>
                            <Switch checked={field.value === 'active'} onCheckedChange={checked => field.onChange(checked ? 'active' : 'inactive')} />
                        </FormControl>
                    </FormItem>
                )} />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? 'Saving...' : 'Save Method'}
                </Button>
            </form>
        </Form>
    );
}
