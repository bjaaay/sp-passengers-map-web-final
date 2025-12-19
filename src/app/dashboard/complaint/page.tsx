
"use client"

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { database } from '@/lib/firebase';
import { ref, onValue, update } from 'firebase/database';
import type { Complaint } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageViewDialog } from '@/components/image-view-dialog';
import { ArrowLeft } from 'lucide-react';

export default function ComplaintPage() {
  const searchParams = useSearchParams();
  const complaintId = searchParams.get('id');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [status, setStatus] = useState<Complaint['status']>('New');
  const { toast } = useToast();
  const [isImageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  const handleSave = () => {
    if (!complaint) return;

    const reportRef = ref(database, `reports/${complaint.userId}/${complaint.id}`);
    update(reportRef, { resolutionNotes, status })
      .then(() => {
        toast({ title: 'Complaint Updated', description: 'The complaint details have been saved.' });
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

  return (
    <div className="container mx-auto p-4">
        <div className="mb-4">
            <Button asChild variant="outline">
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Complaint Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>License Plate:</strong> {complaint.licensePlate}</div>
            <div><strong>Vehicle Type:</strong> {complaint.vehicleType}</div>
            <div><strong>Incident Type:</strong> {complaint.incidentType}</div>
            <div><strong>Route:</strong> {complaint.route}</div>
            <div><strong>Incident Date:</strong> {complaint.incidentDate}</div>
            <div><strong>Incident Time:</strong> {complaint.incidentTime}</div>
            <div><strong>Submitted Date:</strong> {complaint.submittedDate}</div>
            <div>
              <strong>Status:</strong>
              <Badge>{complaint.status}</Badge>
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
              <SelectTrigger id="status">
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
    </div>
  );
}
