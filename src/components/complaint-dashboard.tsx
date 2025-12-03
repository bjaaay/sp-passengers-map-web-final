
"use client"

import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ComplaintCard } from "@/components/complaint-card"
import { RegisterVehicleForm } from "@/components/register-vehicle-form"
import { VehicleList } from "./vehicle-list";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { UserCircle, LogOut, Search, Inbox } from "lucide-react";
import Link from "next/link";
import { signOut, User } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { ref, onValue, update, remove } from "firebase/database";
import { useRouter } from "next/navigation";
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DatePicker } from './date-picker';
import type { Complaint } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { MunicipalContactsForm } from "./municipal-contacts-form";
import { TerminalForm } from "./terminal-form";
import { MunicipalityForm } from "./municipality-form";
import { municipalities } from "@/lib/municipalities";

interface UserData {
  firstName: string;
  lastName: string;
  office: 'PSO';
  profilePictureUrl?: string;
  municipality?: string;
}

function getMunicipalitiesFromRoute(route: string): string[] {
  if (!route) return [];
  const lowerCaseRoute = route.toLowerCase();
  return municipalities.filter(muni => 
    lowerCaseRoute.includes(muni.toLowerCase())
  );
}


export function ComplaintDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintToDelete, setComplaintToDelete] = useState<Complaint | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
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
    if (!currentUser || !userData) return;

    const reportsRef = ref(database, 'reports');

    const unsubscribe = onValue(reportsRef, (snapshot) => {
      const allReports = snapshot.val();
      if (allReports) {
        const loadedComplaints: Complaint[] = [];
        Object.keys(allReports).forEach(userId => {
          const userReports = allReports[userId];
          Object.keys(userReports).forEach(reportId => {
            const reportData = userReports[reportId];

            const route = reportData.route || '';
            const complaintMunicipalities = getMunicipalitiesFromRoute(route);

            if (userData.municipality && !complaintMunicipalities.map(m => m.toLowerCase()).includes(userData.municipality.toLowerCase())) {
                return;
            }
            
            const imageUrls = (reportData.images && Array.isArray(reportData.images)) ? reportData.images : [];
            
            let finalSubmittedDate = 'No Date';
            if (reportData.timestamp) {
                finalSubmittedDate = new Date(reportData.timestamp).toLocaleDateString();
            } else if (reportData.date) {
                finalSubmittedDate = reportData.date;
            }

            loadedComplaints.push({
              id: reportId,
              userId: userId,
              incidentPhotoUrls: imageUrls,
              vehicleType: reportData.vehicleType || 'Unknown',
              incidentType: reportData.incidentType || 'other',
              licensePlate: reportData.plate || 'No Plate',
              route: reportData.route || 'No Route',
              incidentTime: reportData.time || 'No Time',
              incidentDate: reportData.date || 'No Date',
              description: reportData.description || 'No Description',
              status: reportData.status || 'New',
              submittedDate: finalSubmittedDate,
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

  }, [currentUser, toast, userData]);


  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const updateReportStatus = (id: string, status: 'New' | 'Review' | 'Resolved') => {
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

  const normalizeVehicleType = (vehicleType: string): string => {
    return vehicleType.toLowerCase().replace(/-/g, "").replace(/ /g, "_");
  };

   const filteredComplaints = useMemo(() => {
    return complaints.filter(complaint => {
      const searchMatch =
        searchTerm === '' ||
        complaint.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch =
        statusFilter === 'All' || complaint.status === statusFilter;
      const vehicleMatch = vehicleTypeFilter === 'All' || normalizeVehicleType(complaint.vehicleType) === vehicleTypeFilter;
      const incidentMatch = incidentTypeFilter === 'All' || complaint.incidentType === incidentTypeFilter;

      const dateMatch = !dateFilter || (complaint.incidentDate && new Date(complaint.incidentDate).toDateString() === dateFilter.toDateString());
      
      return searchMatch && statusMatch && vehicleMatch && dateMatch && incidentMatch;
    });
  }, [complaints, searchTerm, statusFilter, vehicleTypeFilter, incidentTypeFilter, dateFilter]);


  if (!currentUser || !userData) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

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
            </div>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userData.profilePictureUrl} alt="@user" />
                    <AvatarFallback>{userData.firstName?.[0]}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userData.firstName} {userData.lastName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          Public Safety Office
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
           </div>
         </div>
       </header>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="complaints" className="w-full">
          <TabsList className="grid w-full grid-cols-6 max-w-4xl mx-auto">
            <TabsTrigger value="complaints">Complaints</TabsTrigger>
            <TabsTrigger value="register-vehicle">Register Vehicle</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="municipal-contacts">Municipal Contacts</TabsTrigger>
            <TabsTrigger value="terminals">Terminals</TabsTrigger>
            <TabsTrigger value="municipality">Municipality</TabsTrigger>
          </TabsList>
          <TabsContent value="complaints" className="mt-6">
            <div className="py-4 border-b flex flex-col sm:flex-row gap-2">
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
                    <SelectItem value="jeepney">Jeepney</SelectItem>
                    <SelectItem value="tricycle">Tricycle</SelectItem>
                    <SelectItem value="e-trike">E-trike</SelectItem>
                    <SelectItem value="modern_puv">Modern PUV</SelectItem>
                    <SelectItem value="uv_express">UV Express</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={incidentTypeFilter} onValueChange={setIncidentTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Incident Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Incidents</SelectItem>
                    <SelectItem value="driver_attitude">Driver Attitude</SelectItem>
                    <SelectItem value="vehicle_overload">Vehicle Overload</SelectItem>
                    <SelectItem value="fare_overcharging">Fare Overcharging</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="reckless_driving">Reckless Driving</SelectItem>
                    <SelectItem value="other">Others</SelectItem>
                  </SelectContent>
                </Select>
                 <DatePicker date={dateFilter} setDate={setDateFilter} className="w-full sm:w-[240px]" />
              </div>
            </div>
            {filteredComplaints.length > 0 ? (
              <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredComplaints.map((complaint) => (
                    <ComplaintCard
                      key={complaint.id}
                      complaint={complaint}
                      onStatusChange={updateReportStatus}
                      onDelete={() => setComplaintToDelete(complaint)}
                    />
                  ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Complaints Yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        There are currently no complaints to display for {userData.municipality}.
                    </p>
                </div>
            )}
          </TabsContent>
          <TabsContent value="register-vehicle" className="mt-6">
            <div className="max-w-2xl mx-auto">
              <RegisterVehicleForm />
            </div>
          </TabsContent>
           <TabsContent value="vehicles" className="mt-6">
            <VehicleList />
          </TabsContent>
          <TabsContent value="municipal-contacts" className="mt-6">
            <div className="max-w-2xl mx-auto">
              <MunicipalContactsForm />
            </div>
          </TabsContent>
          <TabsContent value="terminals" className="mt-6">
            <div className="max-w-2xl mx-auto">
              <TerminalForm />
            </div>
          </TabsContent>
          <TabsContent value="municipality" className="mt-6">
            <div className="max-w-2xl mx-auto">
              <MunicipalityForm />
            </div>
          </TabsContent>
        </Tabs>
      </main>

       <AlertDialog open={!!complaintToDelete} onOpenChange={() => setComplaintToDelete(null)}>
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
      </AlertDialog>
    </div>
  )
}
