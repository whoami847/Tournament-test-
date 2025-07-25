
'use client';

import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusIcon, TrashIcon } from 'lucide-react';
import { useStore } from '@/lib/store';
import { GatewayDialog } from '@/components/admin/gateway-dialog';
import type { Gateway } from '@/lib/gateways';
import { deleteGateway } from '@/lib/gateways';
import { useToast } from '@/hooks/use-toast';

export default function GatewaysPage() {
  const { gateways, initializeGateways } = useStore();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = initializeGateways();
    return () => unsubscribe();
  }, [initializeGateways]);

  const handleDelete = async (gatewayId: string) => {
    if (window.confirm('Are you sure you want to delete this gateway?')) {
      try {
        await deleteGateway(gatewayId);
        toast({ title: 'Success', description: 'Gateway deleted successfully.' });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete gateway.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment Gateways</CardTitle>
            <CardDescription>Manage the automated payment gateways for your store.</CardDescription>
          </div>
          <GatewayDialog>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Gateway
            </Button>
          </GatewayDialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {gateways.length > 0 ? gateways.map((gateway: Gateway) => (
            <div key={gateway.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <h3 className="font-semibold">{gateway.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant={gateway.isLive ? 'destructive' : 'secondary'}>
                    {gateway.isLive ? 'Live' : 'Sandbox'}
                  </Badge>
                  <Badge variant={gateway.enabled ? 'default' : 'outline'}>
                    {gateway.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GatewayDialog gateway={gateway}>
                  <Button variant="outline">Edit</Button>
                </GatewayDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(gateway.id)}
                    >
                      <TrashIcon className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )) : (
            <div className="text-center py-10 border border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">No Gateways Found</h3>
                <p className="text-muted-foreground mt-2">Click "New Gateway" to add a payment provider.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
