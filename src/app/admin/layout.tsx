'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isRootAdmin = pathname === '/admin';

  return (
    <div className="flex min-h-screen w-full flex-col">
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/80 px-4 backdrop-blur-sm sm:px-6"
      >
        <div className="flex items-center gap-4">
            {!isRootAdmin ? (
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
            ) : (
                <Link href="/" className="text-muted-foreground hover:text-foreground">
                    <Home className="h-5 w-5" />
                    <span className="sr-only">Back to App</span>
                </Link>
            )}
            <h1 className="text-xl font-bold">Admin Controls</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
            <Avatar className="h-9 w-9">
                <AvatarImage src="https://placehold.co/40x40.png" alt="Admin" data-ai-hint="male admin avatar" />
                <AvatarFallback>A</AvatarFallback>
            </Avatar>
        </div>
      </motion.header>
      <main className="flex flex-1 flex-col gap-4 bg-background/50 p-4 sm:p-6">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
