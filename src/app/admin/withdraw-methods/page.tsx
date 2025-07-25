
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { WithdrawMethod } from '@/types';
import { getWithdrawMethodsStream, addWithdrawMethod, updateWithdrawMethod, deleteWithdrawMethod } from '@/lib/withdraw-methods-service';
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
import { WithdrawMethodForm } from '@/components/admin/withdraw-method-form';
import { Badge } from '@/components/ui/badge';

export default function AdminWithdrawMethodsPage() {
    const [methods, setMethods] = useState<WithdrawMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<WithdrawMethod | undefined>(undefined);
    const [methodToDelete, setMethodToDelete] = useState<WithdrawMethod | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = getWithdrawMethodsStream((data) => {
            setMethods(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleFormSubmit = async (data: any) => {
        setIsSubmitting(true);
        const result = selectedMethod
            ? await updateWithdrawMethod(selectedMethod.id, data)
            : await addWithdrawMethod(data);

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

        const result = await deleteWithdrawMethod(methodToDelete.id);
        if (result.success) {
            toast({ title: "Method Deleted" });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setMethodToDelete(null);
    };
    
    const openDialog = (method?: WithdrawMethod) => {
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
                        <CardTitle>Withdrawal Methods</CardTitle>
                        <CardDescription>Configure user withdrawal options.</CardDescription>
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
                            <WithdrawMethodForm 
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
                                        <TableHead>Fee</TableHead>
                                        <TableHead>Limits (Min/Max)</TableHead>
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
                                            <TableCell>{method.feePercentage}%</TableCell>
                                            <TableCell>{method.minAmount} / {method.maxAmount}</TableCell>
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
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Fee</span>
                                            <span className="font-medium text-foreground">{method.feePercentage}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Min Limit</span>
                                            <span className="font-medium text-foreground">{method.minAmount} TK</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Max Limit</span>
                                            <span className="font-medium text-foreground">{method.maxAmount} TK</span>
                                        </div>
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
                            <p className="text-muted-foreground mt-2">Add a withdrawal method to get started.</p>
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
