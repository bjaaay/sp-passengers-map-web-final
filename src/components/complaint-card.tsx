"use client"

import Image from 'next/image';
import type { Complaint } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Bus, Truck, Bike, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComplaintCardProps {
  complaint: Complaint;
  onStatusChange: (id: string, status: 'Resolved' | 'Pending') => void;
}

const vehicleIcons = {
  Car: <Car className="h-5 w-5" />,
  Bus: <Bus className="h-5 w-5" />,
  Truck: <Truck className="h-5 w-5" />,
  Motorcycle: <Bike className="h-5 w-5" />,
};

export function ComplaintCard({ complaint, onStatusChange }: ComplaintCardProps) {
  const isResolved = complaint.status === 'Resolved';

  return (
    <Card className={cn(
      "flex flex-col transition-all duration-300 ease-in-out",
      isResolved ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50' : ''
    )}>
      <CardHeader className="p-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-md">
           <Image
            src={complaint.incidentPhotoUrl}
            alt={`Incident involving ${complaint.licensePlate}`}
            data-ai-hint={complaint.incidentPhotoAiHint}
            fill
            className="object-cover"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0">
        <div className="mb-2 flex items-center justify-between">
          <CardTitle className="text-lg font-semibold leading-none tracking-tight">{complaint.licensePlate}</CardTitle>
          <Badge variant={isResolved ? 'default' : 'secondary'} className={cn(
            isResolved ? 'bg-accent text-accent-foreground' : ''
          )}>
            {isResolved ? <CheckCircle2 className="mr-1.5 h-4 w-4" /> : <AlertCircle className="mr-1.5 h-4 w-4" />}
            {complaint.status}
          </Badge>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {vehicleIcons[complaint.vehicleType]}
            <span>{complaint.vehicleType}</span>
          </div>
          <p className="line-clamp-2">{complaint.description}</p>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          variant={isResolved ? 'outline' : 'default'}
          size="sm" 
          className="w-full"
          onClick={() => onStatusChange(complaint.id, isResolved ? 'Pending' : 'Resolved')}
        >
          {isResolved ? 'Mark as Pending' : 'Mark as Resolved'}
        </Button>
      </CardFooter>
    </Card>
  );
}
