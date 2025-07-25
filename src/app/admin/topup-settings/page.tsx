
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { TopupMethod } from '@/types';
import { getTopupMethodsStream, addTopupMethod, updateTopupMethod, deleteTopupMethod } from '@/lib/topup-settings-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { TopupSettingForm } from '@/components/admin/topup-setting-form';
import { Badge } from '@/components/ui/badge';

export default function AdminTopupSettingsPage() {
    const [methods, setMethods] = useState<TopupMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<TopupMethod | undefined>(undefined);
    const [methodToDelete, setMethodToDelete] = useState<TopupMethod | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = getTopupMethodsStream((data) => {
            setMethods(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleFormSubmit = async (data: any) => {
        setIsSubmitting(true);
        const result = selectedMethod
            ? await updateTopupMethod(selectedMethod.id, data)
            : await addTopupMethod(data);

        if (result.success) {
            toast({
                title: selectedMethod ? "Method Updated!" : "Method Added!",
                description: `"${data.name}" has been successfully saved.`,
            });
            setIsDialogOpen(false);
            setSelectedMethod(undefined);
        } else {
            toast({
                title: "Error",
                description: result.error || "An unexpected error occurred.",
                variant: "destructive",
            });
        }
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!methodToDelete) return;

        const result = await deleteTopupMethod(methodToDelete.id);
        if (result.success) {
            toast({ title: "Method Deleted" });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setMethodToDelete(null);
    };
    
    const openDialog = (method?: TopupMethod) => {
        setSelectedMethod(method);
        setIsDialogOpen(true);
    }
    
    const handleDialogChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) setSelectedMethod(undefined);
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Top-up Settings</CardTitle>
                        <CardDescription>Configure methods for users to add funds.</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                        <DialogTrigger asChild>
                            <Button size="sm" onClick={() => openDialog()}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Method
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{selectedMethod ? 'Edit Method' : 'Add New Method'}</DialogTitle>
                            </DialogHeader>
                            <TopupSettingForm 
                                method={selectedMethod}
                                onSubmit={handleFormSubmit}
                                isSubmitting={isSubmitting}
                            />
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => ( <Skeleton key={i} className="h-16 w-full" /> ))}
                        </div>
                    ) : methods.length > 0 ? (
                        <>
                        {/* Desktop Table */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Icon</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Instructions</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {methods.map((method) => (
                                        <TableRow key={method.id}>
                                            <TableCell>
                                                {method.image ? (
                                                    <Image src={method.image} alt={method.name} width={40} height={40} className="rounded-md object-contain" />
                                                ) : (
                                                    <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs">No Icon</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{method.name}</TableCell>
                                            <TableCell className="whitespace-pre-line max-w-sm truncate">{method.instructions}</TableCell>
                                            <TableCell>
                                                <Badge variant={method.status === 'active' ? 'default' : 'secondary'} className={method.status === 'active' ? 'bg-green-500' : ''}>
                                                    {method.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openDialog(method)}>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => setMethodToDelete(method)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card List */}
                        <div className="md:hidden space-y-4">
                            {methods.map((method) => (
                               <div key={method.id} className="bg-muted/50 p-4 rounded-lg border">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                             {method.image ? (
                                                <Image src={method.image} alt={method.name} width={40} height={40} className="rounded-md object-contain" />
                                            ) : (
                                                <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs flex-shrink-0">No Icon</div>
                                            )}
                                            <div>
                                                <p className="font-semibold">{method.name}</p>
                                            </div>
                                        </div>
                                        <Badge variant={method.status === 'active' ? 'default' : 'secondary'} className={`${method.status === 'active' ? 'bg-green-500' : ''} flex-shrink-0`}>
                                            {method.status}
                                        </Badge>
                                    </div>
                                    
                                    <div className="space-y-2 text-sm border-t border-muted-foreground/20 pt-3">
                                        <p className="whitespace-pre-line text-foreground/80">{method.instructions}</p>
                                    </div>
                                    
                                    <div className="flex items-center justify-end gap-2 mt-4">
                                        <Button variant="outline" size="sm" onClick={() => openDialog(method)}>Edit</Button>
                                        <Button variant="destructive" size="sm" onClick={() => setMethodToDelete(method)}>Delete</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        </>
                    ) : (
                        <div className="text-center py-16 border border-dashed rounded-lg">
                            <h3 className="text-xl font-medium">No Methods Configured</h3>
                            <p className="text-muted-foreground mt-2">Add a top-up method to get started.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!methodToDelete} onOpenChange={(open) => !open && setMethodToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the method "{methodToDelete?.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
