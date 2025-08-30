
"use client"

import Image from 'next/image';
import type { Complaint } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Eye, Car, Bike, Bus, Truck, MessageSquareText, HelpCircle, ImageOff, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ComplaintCardProps {
  complaint: Complaint;
  onStatusChange: (id: string, status: 'New' | 'Review' | 'Resolved') => void;
  onViewDetails: () => void;
  onDelete: (id: string) => void;
}

const vehicleIcons: Record<string, React.ReactNode> = {
  Jeepney: <Car className="h-5 w-5" />,
  Tricycle: <Bike className="h-5 w-5" />,
  Trike: <Bike className="h-5 w-5" />,
  'Modern PUV': <Bus className="h-5 w-5" />,
  UVExpress: <Truck className="h-5 w-5" />,
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; borderColor: string; }> = {
    New: { icon: <AlertCircle className="mr-1.5 h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', borderColor: 'border-yellow-200 dark:border-yellow-800' },
    Review: { icon: <Eye className="mr-1.5 h-4 w-4" />, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', borderColor: 'border-blue-200 dark:border-blue-800' },
    Resolved: { icon: <CheckCircle2 className="mr-1.5 h-4 w-4" />, color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', borderColor: 'border-green-200 dark:border-green-800' },
    Unknown: { icon: <HelpCircle className="mr-1.5 h-4 w-4" />, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300', borderColor: 'border-gray-200 dark:border-gray-800' },
}

export function ComplaintCard({ complaint, onStatusChange, onViewDetails, onDelete }: ComplaintCardProps) {
  const currentStatusConfig = statusConfig[complaint.status] || statusConfig.Unknown;
  const statusLabel = complaint.status || 'Unknown';
  const vehicleIcon = vehicleIcons[complaint.vehicleType] || <HelpCircle className="h-5 w-5" />;
  const isDataUrl = complaint.incidentPhotoUrl && complaint.incidentPhotoUrl.startsWith('data:image');
  
  return (
    <Card className={cn(
      "flex flex-col transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1",
      currentStatusConfig.borderColor,
      complaint.status === 'Resolved' ? 'bg-green-50/50 dark:bg-green-950/50' : ''
    )}>
       <CardHeader className="p-4 cursor-pointer" onClick={onViewDetails}>
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
           {isDataUrl ? (
            <Image
              src={complaint.incidentPhotoUrl}
              alt={`Incident involving ${complaint.licensePlate}`}
              fill
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
              className="object-cover"
            />
           ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="h-10 w-10 text-muted-foreground" />
            </div>
           )}
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
            {vehicleIcon}
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
        {complaint.status === 'Resolved' ? (
            <Button variant="destructive" size="sm" onClick={() => onDelete(complaint.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          ) : (
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
          )}
      </CardFooter>
    </Card>
  );
}
