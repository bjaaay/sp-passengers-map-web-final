
"use client";

import Image from 'next/image';
import { format, isValid, parse } from 'date-fns';
import type { Complaint } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComplaintDetailsDialogProps {
  complaint: Complaint;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStatusChange: (id: string, status: 'New' | 'Review' | 'Resolved') => void;
}

export function ComplaintDetailsDialog({ complaint, isOpen, onOpenChange, onStatusChange }: ComplaintDetailsDialogProps) {
  
  const handleResolve = () => {
    onStatusChange(complaint.id, 'Resolved');
    onOpenChange(false);
  };
  
  let formattedDate = "Date not available";
  if (complaint.incidentDate) {
    // Attempt to parse multiple common formats, though DB seems to be "M/d/yyyy" or "yyyy-MM-dd"
    const parsedDate = parse(complaint.incidentDate, "M/d/yyyy", new Date());
    const incidentDate = isValid(parsedDate) ? parsedDate : parse(complaint.incidentDate, "yyyy-MM-dd", new Date());
    if (isValid(incidentDate)) {
        formattedDate = format(incidentDate, "MMMM dd, yyyy");
    }
  }

  let formattedTime = "Time not available";
  if (complaint.incidentTime) {
    try {
      // Assuming time is a string like "4:59 PM"
      formattedTime = complaint.incidentTime;
    } catch (e) {
      console.error("Error parsing time:", e);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">Complaint Details</DialogTitle>
        <DialogDescription className="sr-only">Detailed view of a single complaint report.</DialogDescription>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative h-64 md:h-auto">
            <Image
              src={complaint.incidentPhotoUrl}
              alt={`Incident involving ${complaint.licensePlate}`}
              data-ai-hint={complaint.incidentPhotoAiHint}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover rounded-l-lg"
            />
          </div>
          <div className="flex flex-col bg-secondary/50">
            <div className="p-6 pb-2 space-y-3 flex-grow">
               <h2 className="text-2xl font-bold">{complaint.vehicleType} {complaint.licensePlate}</h2>
               <p className="text-muted-foreground font-medium">{complaint.route || "Route not specified"}</p>
               <p className="text-sm text-muted-foreground">{formattedTime}, {formattedDate}</p>

                <div className="mt-4 p-4 bg-background/70 rounded-md max-h-60 overflow-y-auto">
                   <p className="text-foreground/90">{complaint.description}</p>
                </div>
            </div>
             <div className="p-6 pt-0">
               <Button 
                size="lg" 
                className={cn(
                    "w-full bg-green-600 hover:bg-green-700 text-white",
                    complaint.status === 'Resolved' && "bg-gray-400 cursor-not-allowed"
                )}
                onClick={handleResolve}
                disabled={complaint.status === 'Resolved'}
                >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    {complaint.status === 'Resolved' ? 'Resolved' : 'Resolve'}
                </Button>
            </div>
          </div>
        </div>
        <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 rounded-full h-8 w-8 bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
        >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
    

    
