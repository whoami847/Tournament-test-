'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function SuccessContent() {
    const searchParams = useSearchParams();
    // In this new model, we just show a success message.
    // The actual crediting happens via the success API route.
    const transactionId = searchParams.get('tran_id');

    return (
        <div className="container mx-auto px-4 py-8 md:pb-8 pb-24 flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto w-fit mb-4">
                       <CheckCircle2 className="h-12 w-12 text-green-500" />
                    </div>
                    <CardTitle>Payment Successful!</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription className="mb-6">
                        Your payment is being processed and your wallet will be updated shortly. Thank you!
                    </CardDescription>
                    <Button asChild>
                        <Link href="/wallet">Go to Wallet</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto px-4 py-8 md:pb-8 pb-24 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
        }>
            <SuccessContent />
        </Suspense>
    )
}
