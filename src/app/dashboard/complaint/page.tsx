"use client"

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { database } from '@/lib/firebase';
import { ref, onValue, update } from 'firebase/database';
import Image from 'next/image';
import { format, isValid, parse } from 'date-fns';
import type { Complaint } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ImageOff, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function ComplaintDetailsContent() {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = searchParams.get('id');

  useEffect(() => {
    if (!id) {
        setLoading(false);
        return;
    };

    const reportsRef = ref(database, 'reports');
    const unsubscribe = onValue(reportsRef, (snapshot) => {
      const allReports = snapshot.val();
      let foundComplaint: Complaint | null = null;
      if (allReports) {
        for (const userId in allReports) {
            if (allReports[userId][id]) {
                const reportData = allReports[userId][id];
                const imageUrl = (reportData.images && Array.isArray(reportData.images) && reportData.images.length > 0) ? reportData.images[0] : '';
                foundComplaint = {
                    id: id,
                    userId: userId,
                    incidentPhotoUrl: imageUrl,
                    vehicleType: reportData.vehicle || 'UV Express',
                    licensePlate: reportData.plate || 'No Plate',
                    route: reportData.route || 'No Route',
                    incidentTime: reportData.time || 'No Time',
                    incidentDate: reportData.date || 'No Date',
                    description: reportData.description || 'No Description',
                    status: reportData.status || 'New',
                    submittedDate: reportData.submittedDate || new Date().toLocaleDateString(),
                };
                break; 
            }
        }
      }
      setComplaint(foundComplaint);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  const handleResolve = () => {
    if (complaint) {
      const reportRef = ref(database, `reports/${complaint.userId}/${complaint.id}`);
      update(reportRef, { status: 'Resolved' })
        .then(() => {
            toast({ title: "Status Updated", description: `Complaint moved to Resolved` });
            router.push('/dashboard');
        })
        .catch(error => {
            toast({ variant: 'destructive', title: "Update Failed", description: error.message });
        });
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!complaint) {
    return (
        <div className="flex flex-col h-screen items-center justify-center text-center">
            <h2 className="text-2xl font-bold mb-4">Complaint Not Found</h2>
            <p className="text-muted-foreground mb-6">The requested complaint could not be found. It may have been deleted or the link may be incorrect.</p>
            <Button onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Button>
        </div>
    );
  }

  let formattedDate = "Date not available";
  if (complaint.incidentDate) {
    try {
      const parsedDate = parse(complaint.incidentDate, "M/d/yyyy", new Date());
      const incidentDate = isValid(parsedDate) ? parsedDate : new Date(complaint.incidentDate);
      if (isValid(incidentDate)) {
          formattedDate = format(incidentDate, "MMMM dd, yyyy");
      }
    } catch(e) {}
  }

  let formattedSubmittedDate = "Date not available";
  if (complaint.submittedDate) {
      try {
          const submittedDate = new Date(complaint.submittedDate);
          if(isValid(submittedDate)) {
              formattedSubmittedDate = format(submittedDate, "MMMM dd, yyyy");
          }
      } catch (e) {}
  }

  const isDataUrl = complaint.incidentPhotoUrl && complaint.incidentPhotoUrl.startsWith('data:image');

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-2 border rounded-lg overflow-hidden shadow-lg">
              <div className="relative h-64 md:h-[500px] bg-muted">
                {isDataUrl ? (
                  <Image
                    src={complaint.incidentPhotoUrl}
                    alt={`Incident involving ${complaint.licensePlate}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-center p-4">
                    <ImageOff className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">No photo provided.</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col bg-secondary/50">
                <div className="p-6 pb-2 space-y-3 flex-grow">
                   <h2 className="text-2xl font-bold">{complaint.vehicleType} {complaint.licensePlate}</h2>
                   <p className="text-muted-foreground font-medium">{complaint.route || "Route not specified"}</p>
                   
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Incident Time & Date:</strong> {complaint.incidentTime}, {formattedDate}</p>
                      <p><strong>Submitted Date:</strong> {formattedSubmittedDate}</p>
                   </div>
    
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
        </div>
    </main>
  );
}

export default function ComplaintDetailsPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Page...</div>}>
            <ComplaintDetailsContent />
        </Suspense>
    )
}
