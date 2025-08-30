
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
import { PassengersMapLogo } from './icons';
import { Search, UserCircle, LogOut, Settings, PlusCircle } from 'lucide-react';
import { DatePicker } from './date-picker';
import { AnimatePresence, motion } from 'framer-motion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { database, auth } from '@/lib/firebase';
import { ref, onValue, update } from 'firebase/database';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface UserData {
  firstName: string;
  lastName: string;
  office: 'PSO' | 'LTFRB';
}

export function ComplaintDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();


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
      } else {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;
  
    const reportsRef = ref(database, 'reports/');
    const unsubscribe = onValue(reportsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allComplaints: Complaint[] = [];
        Object.keys(data).forEach(userId => {
          const userReports = data[userId];
          if (userReports) {
            Object.keys(userReports).forEach(reportId => {
              const reportData = userReports[reportId];
              
              const imageUrl = (reportData.images && Array.isArray(reportData.images) && reportData.images.length > 0) ? reportData.images[0] : '';
              
              const complaint: Complaint = {
                id: reportId,
                incidentPhotoUrl: imageUrl,
                vehicleType: reportData.vehicle || 'Van',
                licensePlate: reportData.plate || 'No Plate',
                route: reportData.route || 'No Route',
                incidentTime: reportData.time || 'No Time',
                incidentDate: reportData.date || 'No Date',
                description: reportData.description || 'No Description',
                status: reportData.status || 'New',
              };
              allComplaints.push(complaint);
            });
          }
        });
        setComplaints(allComplaints);
      } else {
        setComplaints([]);
      }
    }, (error) => {
      console.error("Firebase Read Error:", error);
    });
  
    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const updateReportStatus = (id: string, status: 'New' | 'Review' | 'Resolved') => {
    setComplaints(prevComplaints =>
        prevComplaints.map(c => c.id === id ? { ...c, status } : c)
    );

    if (selectedComplaint && selectedComplaint.id === id) {
        setSelectedComplaint(prev => prev ? { ...prev, status } : null);
    }
    
    console.log(`Status for report ${id} changed to ${status}. DB update needs implementation.`);
  };

  const filteredComplaints = useMemo(() => {
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
  }, [complaints, searchTerm, statusFilter, vehicleTypeFilter, dateFilter]);

  if (!currentUser || !userData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // A flag to determine if the dashboard is being rendered inside another component (like the LTFRB dashboard)
  const isEmbedded = userData.office === 'LTFRB';

  return (
    <div className="flex flex-col h-full">
      {/* Conditionally render header if not embedded */}
      {!isEmbedded && (
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <PassengersMapLogo className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight">Passengers Map</h1>
              </div>
              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://i.pravatar.cc/150?u=${currentUser.uid}`} alt="@user" />
                        <AvatarFallback>{userData.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userData.firstName} {userData.lastName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {userData.office === 'PSO' ? 'Public Safety Office' : 'LTFRB Office'}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     {userData.office === 'LTFRB' && (
                      <DropdownMenuItem asChild>
                        <Link href="/register-vehicle">
                          <PlusCircle className="mr-2 h-4 w-4" />
                          <span>Register Vehicle</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
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
                    <SelectItem value="Trike">Trike</SelectItem>
                    <SelectItem value="Modern PUV">Modern PUV</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                  </SelectContent>
                </Select>
                 <DatePicker date={dateFilter} setDate={setDateFilter} className="w-full sm:w-[240px]" />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main content area, adjusts padding if embedded */}
      <main className={cn("flex-grow", !isEmbedded && "container mx-auto px-4 sm:px-6 lg:px-8 py-8")}>
        <AnimatePresence>
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredComplaints.map(complaint => (
               <motion.div layout key={complaint.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <ComplaintCard
                  complaint={complaint}
                  onStatusChange={updateReportStatus}
                  onViewDetails={() => setSelectedComplaint(complaint)}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
        {filteredComplaints.length === 0 && (
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
      
    </div>
  );
}
