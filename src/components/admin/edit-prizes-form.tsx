'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Tournament } from '@/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2 } from 'lucide-react';

const prizeSchema = z.object({
  prizeDistribution: z.array(z.object({
    place: z.coerce.number().int().min(1, "Place must be a positive integer."),
    amount: z.coerce.number().min(0, "Amount must be non-negative."),
  })),
});

type PrizeFormValues = z.infer<typeof prizeSchema>;

interface EditPrizesFormProps {
    tournament: Tournament;
    onSave: (data: Partial<Tournament>) => void;
}

export function EditPrizesForm({ tournament, onSave }: EditPrizesFormProps) {
    const form = useForm<PrizeFormValues>({
        resolver: zodResolver(prizeSchema),
        defaultValues: {
            prizeDistribution: tournament.prizeDistribution ?? [
                { place: 1, amount: 500 },
                { place: 2, amount: 300 },
                { place: 3, amount: 200 },
            ],
        },
    });
    
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "prizeDistribution"
    });

    function onSubmit(values: PrizeFormValues) {
        onSave({
            prizeDistribution: values.prizeDistribution,
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div>
                    <h4 className="mb-2 text-lg font-medium">Placement Prizes</h4>
                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-4 p-4 border rounded-md bg-muted/50">
                                <FormField
                                    control={form.control}
                                    name={`prizeDistribution.${index}.place`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Place</FormLabel>
                                            <FormControl><Input type="number" placeholder="e.g., 1" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`prizeDistribution.${index}.amount`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Amount (TK)</FormLabel>
                                            <FormControl><Input type="number" placeholder="e.g., 500" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="mt-8">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Remove Prize</span>
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ place: fields.length + 1, amount: 0 })} className="mt-4">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Prize
                    </Button>
                </div>

                <Button type="submit">Save Changes</Button>
            </form>
        </Form>
    );
}
