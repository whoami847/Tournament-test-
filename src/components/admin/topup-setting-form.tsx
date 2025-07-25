
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { TopupMethod } from '@/types';
import { ImageUpload } from './image-upload';
import { Textarea } from '../ui/textarea';

const formSchema = z.object({
  name: z.string().min(2, "Method name is required."),
  image: z.string().url("Please upload an icon for the method."),
  instructions: z.string().min(10, "Instructions must be at least 10 characters long."),
  status: z.enum(['active', 'inactive']),
});

type FormValues = z.infer<typeof formSchema>;

interface TopupSettingFormProps {
    method?: TopupMethod;
    onSubmit: (data: FormValues) => void;
    isSubmitting: boolean;
}

export function TopupSettingForm({ method, onSubmit, isSubmitting }: TopupSettingFormProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: method?.name || '',
            image: method?.image || '',
            instructions: method?.instructions || '',
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
                <FormField control={form.control} name="instructions" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Instructions for User</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="e.g., Send money to 01234567890 (Personal) and enter the Transaction ID below."
                                className="min-h-[120px]"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
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
