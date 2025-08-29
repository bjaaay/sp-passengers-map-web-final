
"use client"

import Image from 'next/image';
import type { Complaint } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Eye, ShieldQuestion, Car, Bike, Bus, Truck, MessageSquareText, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ComplaintCardProps {
  complaint: Complaint;
  onStatusChange: (id: string, status: 'New' | 'Review' | 'Resolved') => void;
  onViewDetails: () => void;
}

const vehicleIcons: Record<Complaint['vehicleType'], React.ReactNode> = {
  Jeepney: <Car className="h-5 w-5" />,
  Tricycle: <Bike className="h-5 w-5" />,
  Trike: <Bike className="h-5 w-5" />,
  'Modern PUV': <Bus className="h-5 w-5" />,
  Van: <Truck className="h-5 w-5" />,
};

const statusConfig = {
    New: { icon: <AlertCircle className="mr-1.5 h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', borderColor: 'border-yellow-200 dark:border-yellow-800' },
    Review: { icon: <Eye className="mr-1.5 h-4 w-4" />, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', borderColor: 'border-blue-200 dark:border-blue-800' },
    Resolved: { icon: <CheckCircle2 className="mr-1.5 h-4 w-4" />, color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', borderColor: 'border-green-200 dark:border-green-800' },
    Unknown: { icon: <HelpCircle className="mr-1.5 h-4 w-4" />, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300', borderColor: 'border-gray-200 dark:border-gray-800' },
}

export function ComplaintCard({ complaint, onStatusChange, onViewDetails }: ComplaintCardProps) {
  const currentStatusConfig = statusConfig[complaint.status] || statusConfig.Unknown;
  const statusLabel = complaint.status || 'Unknown';

  return (
    <Card className={cn(
      "flex flex-col transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1",
      currentStatusConfig.borderColor,
      complaint.status === 'Resolved' ? 'bg-green-50/50 dark:bg-green-950/50' : ''
    )}>
       <CardHeader className="p-4 cursor-pointer" onClick={onViewDetails}>
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
      <CardContent className="flex-grow p-4 pt-0 cursor-pointer" onClick={onViewDetails}>
        <div className="mb-2 flex items-center justify-between">
          <CardTitle className="text-lg font-semibold leading-none tracking-tight">{complaint.licensePlate}</CardTitle>
          <Badge variant={'outline'} className={cn(
            "border-transparent",
            currentStatusConfig.color
          )}>
            {currentStatusConfig.icon}
            {statusLabel}
          </Badge>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {vehicleIcons[complaint.vehicleType] || <ShieldQuestion className="h-5 w-5" />}
            <span>{complaint.vehicleType}</span>
          </div>
          <p className="line-clamp-2">{complaint.description}</p>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={onViewDetails}>
          <MessageSquareText className="mr-2 h-4 w-4" />
          Details
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Change Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            {(['New', 'Review', 'Resolved'] as const).map((status) => (
              <DropdownMenuItem
                key={status}
                disabled={complaint.status === status}
                onClick={() => onStatusChange(complaint.id, status)}
              >
                {status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
