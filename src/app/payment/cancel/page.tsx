
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Frown } from 'lucide-react';

export default function PaymentCancelPage() {
    return (
        <div className="container mx-auto px-4 py-8 md:pb-8 pb-24 flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto w-fit mb-4">
                        <Frown className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <CardTitle>Payment Canceled</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription className="mb-6">Your payment process was canceled. You can try again from your wallet.</CardDescription>
                    <Button asChild>
                        <Link href="/wallet/top-up">Back to Top-up</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
