
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Complaint } from '@/lib/types';
import { ComplaintCard } from './complaint-card';
import { ComplaintDetailsDialog } from './complaint-details-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, UserCircle, LogOut, Settings } from 'lucide-react';
import { DatePicker } from './date-picker';
import { AnimatePresence, motion } from 'framer-motion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { database, auth } from '@/lib/firebase';
import { ref, onValue, update, remove } from 'firebase/database';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  firstName: string;
  lastName: string;
  office: 'PSO' | 'LTFRB';
  profilePictureUrl?: string;
}

interface ComplaintDashboardProps {
  complaints?: Complaint[];
  onStatusChange?: (id: string, status: 'New' | 'Review' | 'Resolved') => void;
  onDelete?: (complaint: Complaint) => void;
  isEmbedded?: boolean;
}

export function ComplaintDashboard({ complaints: initialComplaints, onStatusChange, onDelete, isEmbedded = false }: ComplaintDashboardProps) {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints || []);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [complaintToDelete, setComplaintToDelete] = useState<Complaint | null>(null);
  const router = useRouter();
  const { toast } = useToast();


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserData(snapshot.val());
          }
        });
      } else if (!isEmbedded) { // Don't redirect if it's part of another dashboard
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router, isEmbedded]);

  useEffect(() => {
    // If complaints are passed as props, use them directly.
    if (initialComplaints) {
      setComplaints(initialComplaints);
      return;
    }
    
    // Otherwise, fetch them if this is not an embedded component.
    if (!currentUser || isEmbedded) return;

    const reportsRef = ref(database, 'reports');

    const unsubscribe = onValue(reportsRef, (snapshot) => {
      const allReports = snapshot.val();
      if (allReports) {
        const loadedComplaints: Complaint[] = [];
        // The data is nested by user ID, then by report ID
        Object.keys(allReports).forEach(userId => {
          const userReports = allReports[userId];
          Object.keys(userReports).forEach(reportId => {
            const reportData = userReports[reportId];
            const imageUrl = (reportData.images && Array.isArray(reportData.images) && reportData.images.length > 0) ? reportData.images[0] : '';
            loadedComplaints.push({
              id: reportId,
              userId: userId,
              incidentPhotoUrl: imageUrl,
              vehicleType: reportData.vehicle || 'UV Express',
              licensePlate: reportData.plate || 'No Plate',
              route: reportData.route || 'No Route',
              incidentTime: reportData.time || 'No Time',
              incidentDate: reportData.date || 'No Date',
              description: reportData.description || 'No Description',
              status: reportData.status || 'New',
            });
          });
        });
        setComplaints(loadedComplaints);
      } else {
        setComplaints([]);
      }
    }, (error) => {
      console.error("Firebase Read Error:", error);
       toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "You do not have permission to view reports. Please contact an administrator.",
      });
    });

    return () => unsubscribe();

  }, [currentUser, toast, isEmbedded, initialComplaints]);


  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const updateReportStatus = (id: string, status: 'New' | 'Review' | 'Resolved') => {
    if (onStatusChange) {
      onStatusChange(id, status);
      return;
    }
    const complaintToUpdate = complaints.find(c => c.id === id);
    if (complaintToUpdate && complaintToUpdate.userId) {
      const reportRef = ref(database, `reports/${complaintToUpdate.userId}/${id}`);
      update(reportRef, { status })
        .then(() => {
            toast({ title: "Status Updated", description: `Complaint moved to ${status}` });
        })
        .catch(error => {
            toast({ variant: 'destructive', title: "Update Failed", description: error.message });
        });
    }
  };

  const handleDeleteComplaint = async () => {
    if (!complaintToDelete || !complaintToDelete.userId) return;
    const reportRef = ref(database, `reports/${complaintToDelete.userId}/${complaintToDelete.id}`);
    try {
      await remove(reportRef);
      toast({
        title: "Complaint Deleted",
        description: "The complaint has been successfully removed.",
      });
      setComplaintToDelete(null);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "An error occurred while deleting the complaint.",
      });
    }
  };

  const internalFilteredComplaints = useMemo(() => {
     if (isEmbedded) {
      // If embedded, the parent component handles filtering.
      return complaints;
    }
    return complaints.filter(complaint => {
      const searchMatch =
        searchTerm === '' ||
        complaint.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch =
        statusFilter === 'All' || complaint.status === statusFilter;
      const vehicleMatch =
        vehicleTypeFilter === 'All' || complaint.vehicleType === vehicleTypeFilter;
      
      const dateMatch = !dateFilter || (complaint.incidentDate && new Date(complaint.incidentDate).toDateString() === dateFilter.toDateString());
      
      return searchMatch && statusMatch && vehicleMatch && dateMatch;
    });
  }, [complaints, searchTerm, statusFilter, vehicleTypeFilter, dateFilter, isEmbedded]);

  const handleDeleteClick = (complaint: Complaint) => {
    if (onDelete) {
      onDelete(complaint);
    } else {
      setComplaintToDelete(complaint);
    }
  }

  if (!isEmbedded && (!currentUser || !userData)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const complaintsToRender = isEmbedded ? initialComplaints || [] : internalFilteredComplaints;

  return (
    <div className="flex flex-col h-full">
      {!isEmbedded && (
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  <span className="text-green-500">Passengers</span>
                  <span className="text-blue-500"> Map</span>
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                         <AvatarImage src={userData?.profilePictureUrl || `https://i.pravatar.cc/150?u=${currentUser?.uid}`} alt="@user" />
                        <AvatarFallback>{userData?.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userData?.firstName} {userData?.lastName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {userData?.office === 'PSO' ? 'Public Safety Office' : 'LTFRB Office'}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem asChild>
                        <Link href="/profile">
                          <UserCircle className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="py-4 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by license plate or description..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 sm:flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Review">Review</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Vehicle Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Vehicles</SelectItem>
                    <SelectItem value="Jeepney">Jeepney</SelectItem>
                    <SelectItem value="Tricycle">Tricycle</SelectItem>
                    <SelectItem value="E-trike">E-trike</SelectItem>
                    <SelectItem value="Modern PUV">Modern PUV</SelectItem>
                    <SelectItem value="UV Express">UV Express</SelectItem>
                  </SelectContent>
                </Select>
                 <DatePicker date={dateFilter} setDate={setDateFilter} className="w-full sm:w-[240px]" />
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={cn("flex-grow", !isEmbedded && "container mx-auto px-4 sm:px-6 lg:px-8 py-8")}>
        <AnimatePresence>
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {complaintsToRender.map(complaint => (
               <motion.div layout key={complaint.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <ComplaintCard
                  complaint={complaint}
                  onStatusChange={updateReportStatus}
                  onViewDetails={() => setSelectedComplaint(complaint)}
                  onDelete={() => handleDeleteClick(complaint)}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
        {complaintsToRender.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No complaints found.</p>
            <p>Try adjusting your filters or search term.</p>
          </div>
        )}
      </main>
      
      {selectedComplaint && (
        <ComplaintDetailsDialog
          complaint={selectedComplaint}
          isOpen={!!selectedComplaint}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedComplaint(null);
            }
          }}
          onStatusChange={updateReportStatus}
        />
      )}

      {!isEmbedded && <AlertDialog open={!!complaintToDelete} onOpenChange={() => setComplaintToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the complaint
              for license plate <span className="font-bold">{complaintToDelete?.licensePlate}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setComplaintToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteComplaint}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>}
      
    </div>
  );
}
