
"use client"

import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface ImageViewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  imageUrl: string;
  title: string;
}

export function ImageViewDialog({ isOpen, onOpenChange, imageUrl, title }: ImageViewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{title}</DialogTitle>
           <DialogDescription className="sr-only">Showing image: {title}</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-contain"
          />
        </div>
         <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 rounded-full h-8 w-8 bg-background/50 hover:bg-background"
        >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
