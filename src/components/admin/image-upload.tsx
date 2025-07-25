'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const IMGBB_API_KEY = "a1fce2f5bdc7ab36c7fb4a0c7c0e9286";
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

interface ImageUploadProps {
  initialImageUrl?: string;
  onUploadComplete: (url: string) => void;
}

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
                if (!ctx) return reject(new Error('Failed to get canvas context.'));
                
                let { width, height } = img;
                const maxDim = 1280;
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

                canvas.toBlob((blob) => {
                    if (!blob) return reject(new Error('Canvas to Blob failed.'));
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export function ImageUpload({ initialImageUrl = '', onUploadComplete }: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string>(initialImageUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    let file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

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
        const downloadURL = result.data.url;
        setImageUrl(downloadURL);
        onUploadComplete(downloadURL);
        toast({
          title: 'Image Uploaded',
          description: 'The image is ready to be saved with the form.',
        });
      } else {
        throw new Error(result.error?.message || 'Failed to upload image to ImgBB.');
      }
    } catch (e) {
      const errorMessage = (e as Error).message || 'An unexpected error occurred during image upload.';
      setError(errorMessage);
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-video rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <Image src={imageUrl} alt="Uploaded preview" fill className="object-cover" />
        ) : (
          <div className="text-center text-muted-foreground">
            <Camera className="mx-auto h-12 w-12 mb-2" />
            <p>No image uploaded</p>
          </div>
        )}
        <div 
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
            onClick={triggerFileSelect}
        >
          <div className="text-center text-white">
            <Camera className="mx-auto h-8 w-8 mb-2" />
            <p className="font-semibold">Change Image</p>
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
        disabled={uploading}
      />

      {uploading && (
        <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm text-center text-muted-foreground">Uploading...</p>
        </div>
      )}
      
      {!uploading && !imageUrl &&
        <Button type="button" onClick={triggerFileSelect} disabled={uploading} className="w-full">
            <Camera className="mr-2 h-4 w-4" />
            Upload Image
        </Button>
      }

      {error && <p className="text-sm text-destructive flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</p>}
    </div>
  );
}
