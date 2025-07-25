
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
import { useState, type ReactNode, useEffect } from 'react';

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
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Omit<Gateway, 'id'>>({
    defaultValues: {
      name: 'RupantorPay',
      apiKey: '',
      isLive: false,
      enabled: true,
    },
  });
  
  const isLive = watch('isLive');
  const enabled = watch('enabled');

  useEffect(() => {
    if (gateway) {
      reset(gateway);
    } else {
      reset({
        name: 'RupantorPay',
        apiKey: '',
        isLive: false,
        enabled: true,
      });
    }
  }, [gateway, reset, open]);


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
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              {...register('apiKey', { required: 'API Key is required.' })}
              className="mt-1"
            />
            {errors.apiKey && (
              <p className="text-sm text-destructive mt-1">{errors.apiKey.message}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="isLive">Live Mode</Label>
            <Switch
                id="isLive"
                checked={isLive}
                onCheckedChange={(checked) => setValue('isLive', checked)}
                {...register('isLive')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enabled</Label>
            <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={(checked) => setValue('enabled', checked)}
                {...register('enabled')}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
