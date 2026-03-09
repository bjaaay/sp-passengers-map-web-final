"use client"

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { database } from '@/lib/firebase';
import { ref, onValue, update, push } from 'firebase/database';
import type { Complaint } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageViewDialog } from '@/components/image-view-dialog';
import { ArrowLeft, AlertCircle, Hourglass, ShieldQuestion, CheckCircle2, HelpCircle } from 'lucide-react';
import { JeepneyIcon } from './jeepney-icon';
import { TricycleIcon } from './tricycle-icon';
import { ETrikeIcon } from './e-trike-icon';
import { ModernPuvIcon } from './modern-puv-icon';
import { UvExpressIcon } from './uv-express-icon';
import { AdminHeader } from './admin-header';
import { format, isValid, parse } from 'date-fns';

export default function ComplaintDetails() {
  const searchParams = useSearchParams();
  const complaintId = searchParams.get('id');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [status, setStatus] = useState<Complaint['status']>('New');
  const { toast } = useToast();
  const { userData } = useCurrentUser();
  const [isImageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; }> = {
    New: { icon: <AlertCircle className="mr-1.5 h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
    Pending: { icon: <Hourglass className="mr-1.5 h-4 w-4" />, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' },
    'Under Investigation': { icon: <ShieldQuestion className="mr-1.5 h-4 w-4" />, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
    Resolved: { icon: <CheckCircle2 className="mr-1.5 h-4 w-4" />, color: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' },
    Unknown: { icon: <HelpCircle className="mr-1.5 h-4 w-4" />, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300' },
  };

  const vehicleIcons: Record<string, React.ReactNode> = {
    jeepney: <JeepneyIcon className="h-5 w-5" />,
    tricycle: <TricycleIcon className="h-5 w-5" />,
    'e-trike': <ETrikeIcon className="h-5 w-5" />,
    'modern-puv': <ModernPuvIcon className="h-5 w-5" />,
    'uv-express': <UvExpressIcon className="h-5 w-5" />,
  };

  const formatIncidentType = (incidentType: string): string => {
    const incidentTypeMap: Record<string, string> = {
      'driver_attitude': 'Driver Attitude',
      'vehicle_overload': 'Vehicle Overload',
      'fare_overcharging': 'Fare Overcharging',
      'harassment': 'Harassment',
      'reckless_driving': 'Reckless Driving',
      'other': 'Others'
    };
    return incidentTypeMap[incidentType] || incidentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

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

  useEffect(() => {
    if (!complaintId) return;

    const reportsRef = ref(database, 'reports');
    const unsubscribe = onValue(reportsRef, (snapshot) => {
      const allReports = snapshot.val();
      if (allReports) {
        let foundComplaint: Complaint | null = null;
        
        for (const userId in allReports) {
          if (allReports[userId][complaintId]) {
            const reportData = allReports[userId][complaintId];
            foundComplaint = {
              id: complaintId,
              userId: userId,
              incidentPhotoUrls: Array.isArray(reportData.images) ? reportData.images : [],
              vehicleType: reportData.vehicleType || 'Unknown',
              incidentType: reportData.incidentType || 'other',
              licensePlate: reportData.plate || 'No Plate',
              route: reportData.route || 'No Route',
              incidentTime: reportData.time || 'No Time',
              incidentDate: reportData.date || 'No Date',
              description: reportData.description || 'No Description',
              status: reportData.status || 'New',
              submittedDate: reportData.timestamp ? new Date(reportData.timestamp).toLocaleDateString() : (reportData.date || 'No Date'),
              resolutionNotes: reportData.resolutionNotes || '',
            };
            break; 
          }
        }

        if (foundComplaint) {
          setComplaint(foundComplaint);
          setResolutionNotes(foundComplaint.resolutionNotes || '');
          setStatus(foundComplaint.status || 'New');
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Complaint not found.' });
        }
      }
    });

    return () => unsubscribe();
  }, [complaintId, toast]);

  const formatSubmittedDate = (dateString: string): string => {
    if (!dateString || dateString === 'No Date') return 'Not available';
    
    try {
      const dateObj = new Date(dateString);
      if (isValid(dateObj)) {
        return format(dateObj, "MMM dd, yyyy");
      } else {
        const parsedDate = parse(dateString, "M/d/yyyy", new Date());
        if (isValid(parsedDate)) {
          return format(parsedDate, "MMM dd, yyyy");
        }
      }
    } catch (e) {}
    
    return dateString;
  };

  const handleSave = () => {
    if (!complaint || !userData) return;

    const reportRef = ref(database, `reports/${complaint.userId}/${complaint.id}`);
    const webNotifsRef = ref(database, `webNotifications/${complaint.userId}`);

    // Update the complaint with new status and resolution notes
    update(reportRef, { resolutionNotes, status })
      .then(() => {
        // Create a notification for the mobile app about the status update
        const notification = {
          type: 'complaint_status_updated',
          complaintId: complaint.id,
          status: status,
          resolutionNotes: resolutionNotes,
          timestamp: new Date().toISOString(),
          read: false,
          sender: userData.municipality ? `PSO - ${userData.municipality}` : userData.office || 'PSO',
        };

        // Push the notification to the user's web notifs list
        return push(webNotifsRef, notification);
      })
      .then(() => {
        toast({ title: 'Complaint Updated', description: 'The complaint details have been saved and notification sent.' });
      })
      .catch((error) => {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      });
  };

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageViewerOpen(true);
  };

  if (!complaint) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const currentStatusConfig = statusConfig[complaint.status] || statusConfig.Unknown;
  const vehicleIcon = vehicleIcons[complaint.vehicleType.toLowerCase().replace(/ /g, '-')] || <HelpCircle className="h-5 w-5" />;
  const formattedSubmittedDate = formatSubmittedDate(complaint.submittedDate);
  const formattedIncidentType = formatIncidentType(complaint.incidentType);
  const formattedVehicleType = formatVehicleType(complaint.vehicleType);
  const formattedIncidentDate = formatSubmittedDate(complaint.incidentDate);

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-green-500">Passengers</span>
                <span className="text-blue-500"> Map</span>
              </h1>
              <span className="ml-4 text-sm font-medium text-muted-foreground">Complaint Details</span>
            </div>
            {userData && <AdminHeader userData={userData} />}
            <div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Complaint Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><strong>License Plate:</strong> {complaint.licensePlate}</div>
              <div className="flex items-center gap-2">
                <strong>Vehicle Type:</strong>
                <div className="flex items-center gap-1">
                  {vehicleIcon}
                  <span>{formattedVehicleType}</span>
                </div>
              </div>
              <div><strong>Incident Type:</strong> {formattedIncidentType}</div>
              <div><strong>Route:</strong> {complaint.route}</div>
              <div><strong>Incident Date:</strong> {formattedIncidentDate}</div>
              <div><strong>Incident Time:</strong> {complaint.incidentTime}</div>
              <div><strong>Submitted Date:</strong> {formattedSubmittedDate}</div>
              <div className="flex items-center gap-2">
                <strong>Status:</strong>
                <Badge variant={'outline'} className={"border-transparent " + currentStatusConfig.color}>
                  {currentStatusConfig.icon}
                  {complaint.status}
                </Badge>
              </div>
            </div>
            <div>
              <strong>Description:</strong>
              <p>{complaint.description}</p>
            </div>
            <div>
              <strong>Incident Photos:</strong>
              <div className="flex flex-wrap gap-2 mt-2">
                {complaint.incidentPhotoUrls && complaint.incidentPhotoUrls.length > 0 ? (
                  complaint.incidentPhotoUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Incident photo ${index + 1}`}
                      className="w-24 h-24 object-cover rounded-md cursor-pointer transition-transform hover:scale-105"
                      onClick={() => openImageViewer(url)}
                    />
                  ))
                ) : (
                  <p className="text-muted-foreground">No photos provided.</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="status"><strong>Update Status:</strong></label>
              <Select value={status} onValueChange={(value) => setStatus(value as Complaint['status'])}>
                <SelectTrigger id="status" className="w-[200px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Under Investigation">Under Investigation</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="resolution-notes"><strong>Resolution Notes:</strong></label>
              <Textarea
                id="resolution-notes"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Enter resolution notes..."
                rows={5}
              />
            </div>
            <Button onClick={handleSave}>Save Changes</Button>
          </CardContent>
        </Card>
        {selectedImage && (
          <ImageViewDialog
            isOpen={isImageViewerOpen}
            onOpenChange={setImageViewerOpen}
            imageUrl={selectedImage}
            title="Incident Photo"
          />
        )}
      </main>
    </div>
  );
}