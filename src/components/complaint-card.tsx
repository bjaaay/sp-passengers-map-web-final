"use client"

import { useState } from 'react';
import type { Complaint } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Eye, Car, MessageSquareText, HelpCircle, ImageOff, Trash2, Hourglass, ShieldQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { JeepneyIcon } from './jeepney-icon';
import { TricycleIcon } from './tricycle-icon';
import { ETrikeIcon } from './e-trike-icon';
import { ModernPuvIcon } from './modern-puv-icon';
import { UvExpressIcon } from './uv-express-icon';
import Link from 'next/link';
import { format, isValid, parse } from 'date-fns';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { database } from '@/lib/firebase';
import { ref, update } from 'firebase/database';

interface ComplaintCardProps {
  complaint: Complaint;
  onStatusChange: (id: string, status: 'New' | 'Pending' | 'Under Investigation' | 'Resolved') => void;
  onDelete: (id: string) => void;
}

const vehicleIcons: Record<string, React.ReactNode> = {
  jeepney: <JeepneyIcon className="h-5 w-5" />,
  tricycle: <TricycleIcon className="h-5 w-5" />,
  'e-trike': <ETrikeIcon className="h-5 w-5" />,
  'modern-puv': <ModernPuvIcon className="h-5 w-5" />,
  'uv-express': <UvExpressIcon className="h-5 w-5" />,
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; borderColor: string; }> = {
    New: { icon: <AlertCircle className="mr-1.5 h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', borderColor: 'border-yellow-200 dark:border-yellow-800' },
    Pending: { icon: <Hourglass className="mr-1.5 h-4 w-4" />, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300', borderColor: 'border-orange-200 dark:border-orange-800' },
    'Under Investigation': { icon: <ShieldQuestion className="mr-1.5 h-4 w-4" />, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', borderColor: 'border-blue-200 dark:border-blue-800' },
    Resolved: { icon: <CheckCircle2 className="mr-1.5 h-4 w-4" />, color: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300', borderColor: 'border-green-200 dark:border-green-800' },
    Unknown: { icon: <HelpCircle className="mr-1.5 h-4 w-4" />, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300', borderColor: 'border-gray-200 dark:border-gray-800' },
}

const formatVehicleType = (vehicleType: string): string => {
  const vehicleTypeMap: Record<string, string> = {
    'jeepney': 'Jeepney',
    'tricycle': 'Tricycle',
    'e-trike': 'E-Trike',
    'modern-puv': 'Modern PUV',
    'uv-express': 'UV Express'
  };
  return vehicleTypeMap[vehicleType.toLowerCase().replace(/ /g, '-')] || vehicleType.replace(/\b\w/g, l => l.toUpperCase());
};

export function ComplaintCard({ complaint, onStatusChange, onDelete }: ComplaintCardProps) {
  const { toast } = useToast();
  const [resolutionNotes, setResolutionNotes] = useState(complaint.resolutionNotes || '');

  const currentStatusConfig = statusConfig[complaint.status] || statusConfig.Unknown;
  const statusLabel = complaint.status || 'Unknown';
  const vehicleIcon = vehicleIcons[complaint.vehicleType.toLowerCase().replace(/ /g, '-')] || <HelpCircle className="h-5 w-5" />;
  const formattedVehicleType = formatVehicleType(complaint.vehicleType);
  const thumbnailUrl = complaint.incidentPhotoUrls && complaint.incidentPhotoUrls.length > 0 ? complaint.incidentPhotoUrls[0] : null;
  const viewUrl = `/dashboard/complaint?id=${complaint.id}`;

  let formattedSubmittedDate = "Not available";
  if (complaint.submittedDate && complaint.submittedDate !== 'No Date') {
      try {
          const dateObj = new Date(complaint.submittedDate);
          if (isValid(dateObj)) {
              formattedSubmittedDate = format(dateObj, "MMM dd, yyyy");
          } else {
              const parsedDate = parse(complaint.submittedDate, "M/d/yyyy", new Date());
              if (isValid(parsedDate)) {
                  formattedSubmittedDate = format(parsedDate, "MMM dd, yyyy");
              }
          }
      } catch (e) {}
  }

  const handleSaveNotes = () => {
    if (!complaint.userId || !complaint.id) return;
    const reportRef = ref(database, `reports/${complaint.userId}/${complaint.id}`);
    update(reportRef, { resolutionNotes })
      .then(() => {
          toast({ title: "Notes Saved", description: "Resolution notes have been updated." });
      })
      .catch(error => {
          toast({ variant: 'destructive', title: "Save Failed", description: error.message });
      });
  };

  return (
    <Card className={cn(
      "flex flex-col transition-all duration-200 hover:shadow-md",
      currentStatusConfig.borderColor,
      complaint.status === 'Resolved' ? 'bg-green-50/30 dark:bg-green-950/30' : ''
    )}>
      <Link href={viewUrl}>
        <CardHeader className="p-3 cursor-pointer">
          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
             {thumbnailUrl ? (
              <img
                src={thumbnailUrl.replace('http://', 'https://')}
                alt={`Incident involving ${complaint.licensePlate}`}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                className="absolute top-0 left-0"
              />
             ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-center p-2">
                <ImageOff className="h-8 w-8 text-muted-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">No photo</p>
              </div>
             )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-3 pt-0 cursor-pointer">
          <div className="mb-2 flex items-center justify-between">
            <CardTitle className="text-base font-semibold leading-none tracking-tight">{complaint.licensePlate}</CardTitle>
            <Badge variant={'outline'} className={cn(
              "border-transparent text-xs",
              currentStatusConfig.color
            )}>
              {statusLabel}
            </Badge>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {vehicleIcon}
              <span>{formattedVehicleType}</span>
            </div>
            <div>
              <p className="line-clamp-2">{complaint.description}</p>
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 space-y-0.5">
              <p><strong>Incident:</strong> {complaint.incidentTime} {complaint.incidentDate}</p>
              <p><strong>Submitted:</strong> {formattedSubmittedDate}</p>
            </div>
          </div>
        </CardContent>
       </Link>
    </Card>
  );
}
