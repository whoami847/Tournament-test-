
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { useAuth } from '@/hooks/use-auth';
import { getUserProfileStream, updateUserProfile } from '@/lib/users-service';
import type { PlayerProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EditProfileForm, type EditProfileFormValues } from '@/components/profile/edit-profile-form';

const IMGBB_API_KEY = "a1fce2f5bdc7ab36c7fb4a0c7c0e9286";
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";


// Helper function to compress images
const compressImage = (file: File, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Failed to get canvas context.'));
          }
  
          // Keep aspect ratio
          let { width, height } = img;
          const maxDim = 1024; // Max dimension for profile pictures
          if (width > height) {
            if (width > maxDim) {
              height = Math.round(height * (maxDim / width));
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round(width * (maxDim / height));
              height = maxDim;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
  
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Canvas to Blob failed.'));
              }
              resolve(blob);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
};


export default function EditProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isBannerUploading, setIsBannerUploading] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = getUserProfileStream(user.uid, (data) => {
        setProfile(data);
        if (data) {
          setAvatarPreview(data.avatar);
          setBannerPreview(data.banner || "https://placehold.co/800x300.png");
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

 const handleImageUpload = async (file: File, type: 'avatar' | 'banner') => {
    if (type === 'avatar') setIsAvatarUploading(true);
    if (type === 'banner') setIsBannerUploading(true);

    try {
        const compressedBlob = await compressImage(file);
        
        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', compressedBlob, file.name);

        const response = await fetch(IMGBB_UPLOAD_URL, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (result.success) {
            const url = result.data.url;
            if (type === 'avatar') setAvatarPreview(url);
            if (type === 'banner') setBannerPreview(url);
            toast({
                title: 'Image Ready',
                description: 'Image has been updated. Click "Save Changes" to apply.',
            });
        } else {
            throw new Error(result.error?.message || 'Failed to upload image.');
        }
    } catch (e) {
        toast({
            title: 'Upload Failed',
            description: (e as Error).message,
            variant: 'destructive',
        });
    } finally {
        if (type === 'avatar') setIsAvatarUploading(false);
        if (type === 'banner') setIsBannerUploading(false);
    }
 };


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
      let file = event.target.files?.[0];
      if (!file) return;
      await handleImageUpload(file, type);
  };

  const handleProfileUpdate = async (data: EditProfileFormValues) => {
    if (!user?.uid) return;
    setIsSubmitting(true);
    
    const updateData: Partial<PlayerProfile> = {
        ...data,
        avatar: avatarPreview || profile?.avatar,
        banner: bannerPreview || profile?.banner,
    };

    const result = await updateUserProfile(user.uid, updateData);
    if (result.success) {
      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
      router.push('/profile');
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update profile.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  if (!profile || !avatarPreview || !bannerPreview) {
    return (
      <div className="pb-24 animate-pulse">
        <div className="relative h-48 w-full bg-muted"></div>
        <div className="relative z-10 -mt-16 flex flex-col items-center text-center px-4">
            <Skeleton className="h-28 w-28 rounded-full border-4 border-background" />
        </div>
        <div className="p-4 mt-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    <Skeleton className="h-12 w-32" />
                </CardContent>
            </Card>
        </div>
      </div>
    );
  }
  
  const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Player';

  return (
    <div className="pb-24">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={bannerInputRef}
        onChange={(e) => handleFileChange(e, 'banner')}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
      />
      <input
        type="file"
        ref={avatarInputRef}
        onChange={(e) => handleFileChange(e, 'avatar')}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
      />

      {/* Header Section */}
      <div className="relative h-48 w-full">
        <Image
          src={bannerPreview}
          alt="Profile banner"
          data-ai-hint="abstract background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
             <Button
                variant="outline"
                size="sm"
                className="bg-black/50 text-white hover:bg-black/70 hover:text-white border-white/50"
                onClick={() => bannerInputRef.current?.click()}
                disabled={isBannerUploading}
              >
                {isBannerUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                {isBannerUploading ? 'Uploading...' : 'Upload Banner'}
              </Button>
        </div>
      </div>

      {/* Profile Info Section */}
      <div className="relative z-10 -mt-16 flex flex-col items-center text-center px-4">
        <div className="relative group">
            <Avatar className="h-28 w-28 border-4 border-background">
              <AvatarImage src={avatarPreview} alt="Avatar" data-ai-hint="fantasy character" />
              <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
             <div 
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
              >
                {isAvatarUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full text-white hover:bg-black/50 hover:text-white"
                    >
                        <Camera className="h-6 w-6" />
                    </Button>
                )}
            </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        <Card>
            <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>Change your details below. Click save when you're done.</CardDescription>
            </CardHeader>
            <CardContent>
                <EditProfileForm
                    profile={profile}
                    onSubmit={handleProfileUpdate}
                    isSubmitting={isSubmitting}
                    onClose={() => router.back()}
                />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
