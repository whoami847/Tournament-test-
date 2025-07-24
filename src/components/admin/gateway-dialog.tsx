
'use client';

import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { type Gateway, addGateway, updateGateway } from '@/lib/gateways';
import { useState, type ReactNode } from 'react';

interface GatewayDialogProps {
  gateway?: Gateway;
  children: ReactNode;
}

export function GatewayDialog({ gateway, children }: GatewayDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Omit<Gateway, 'id'>>({
    defaultValues: {
      name: gateway?.name ?? 'RupantorPay',
      storePassword: gateway?.storePassword ?? '',
      isLive: gateway?.isLive ?? false,
      enabled: gateway?.enabled ?? true,
    },
  });

  const onSubmit = async (data: Omit<Gateway, 'id'>) => {
    try {
      if (gateway) {
        await updateGateway(gateway.id, data);
        toast({ title: 'Success', description: 'Gateway updated successfully.' });
      } else {
        await addGateway(data);
        toast({ title: 'Success', description: 'Gateway added successfully.' });
      }
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save gateway.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{gateway ? 'Edit Gateway' : 'New Gateway'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Gateway Name</Label>
            <Input id="name" {...register('name')} readOnly className="mt-1" />
          </div>
          <div>
            <Label htmlFor="storePassword">Store Password</Label>
            <Input
              id="storePassword"
              type="password"
              {...register('storePassword', { required: 'Store Password is required.' })}
              className="mt-1"
            />
            {errors.storePassword && (
              <p className="text-sm text-destructive mt-1">{errors.storePassword.message}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="isLive">Live Mode</Label>
            <Controller
              name="isLive"
              control={control}
              render={({ field }) => (
                <Switch id="isLive" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enabled</Label>
            <Controller
              name="enabled"
              control={control}
              render={({ field }) => (
                <Switch id="enabled" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
