
"use client"

import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ComplaintCard } from "@/components/complaint-card"
import { RegisterVehicleForm } from "@/components/register-vehicle-form"
import { VehicleList } from "./vehicle-list";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UserCircle, LogOut, Search, Inbox, ChevronDown, Menu, X, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminHeader } from "./admin-header";
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
  office: 'PSO' | 'Super Admin';
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
  const [activeSection, setActiveSection] = useState('complaints');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigationItems = [
    { id: 'complaints', label: 'Complaints', icon: Inbox },
    { id: 'register-vehicle', label: 'Register Vehicle', icon: Menu },
    { id: 'vehicles', label: 'Vehicles', icon: Menu },
    { id: 'municipal-contacts', label: 'Municipal Contacts', icon: Menu },
    { id: 'terminals', label: 'Terminals', icon: Menu },
    { id: 'municipality', label: 'Municipality', icon: Menu },
  ];

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
              resolutionNotes: reportData.resolutionNotes || '',
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

  const updateReportStatus = (id: string, status: 'New' | 'Pending' | 'Under Investigation' | 'Resolved') => {
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
    <div className="flex h-full bg-background">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 bg-background border-r transform transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
        lg:translate-x-0
        ${!isSidebarOpen ? 'lg:w-16' : 'lg:w-64'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-3 lg:p-4 border-b">
            {!isSidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden lg:flex mx-auto"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {isSidebarOpen && (
              <>
                <h2 className="text-sm lg:text-lg font-semibold hidden lg:block">Dashboard</h2>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden lg:flex"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-2 lg:p-4 space-y-1 lg:space-y-2">
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "default" : "ghost"}
                className={`
                  w-full justify-start transition-all duration-200 h-9 lg:h-10
                  ${!isSidebarOpen ? 'px-2 lg:px-0' : 'px-2 lg:px-3'}
                `}
                onClick={() => {
                  setActiveSection(item.id);
                  if (window.innerWidth < 1024) {
                    setIsSidebarOpen(false);
                  }
                }}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {isSidebarOpen && (
                  <span className="ml-2 text-sm lg:text-base hidden lg:block">{item.label}</span>
                )}
              </Button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">
                  <span className="text-green-500">Passengers</span>
                  <span className="text-blue-500"> Map</span>
                </h1>
                <span className="ml-4 text-sm font-medium text-muted-foreground capitalize">
                  {navigationItems.find(item => item.id === activeSection)?.label}
                </span>
              </div>
              <AdminHeader userData={userData} />
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-auto">
          {/* Back Button */}
          <div className="mb-6">
            <Button variant="outline" size="sm" asChild>
              <Link href="/landing">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Landing
              </Link>
            </Button>
          </div>

          {/* Content Sections */}
          {activeSection === 'complaints' && (
            <div className="space-y-6">
              <div className="py-4 border-b flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by license plate or description..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Status</SelectItem>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Under Investigation">Under Investigation</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Vehicles</SelectItem>
                      <SelectItem value="jeepney">Jeepney</SelectItem>
                      <SelectItem value="tricycle">Tricycle</SelectItem>
                      <SelectItem value="e-trike">E-Trike</SelectItem>
                      <SelectItem value="modern-puv">Modern PUV</SelectItem>
                      <SelectItem value="uv-express">UV Express</SelectItem>
                    </SelectContent>
                  </Select>
                  <DatePicker
                    date={dateFilter}
                    setDate={setDateFilter}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredComplaints.length > 0 ? (
                  filteredComplaints.map(complaint => (
                    <ComplaintCard
                      key={complaint.id}
                      complaint={complaint}
                      onStatusChange={updateReportStatus}
                      onDelete={() => setComplaintToDelete(complaint)}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No complaints found matching your criteria.
                  </div>
                )}
              </div>
            </div>
          )}
          {activeSection === 'register-vehicle' && (
            <div className="max-w-2xl mx-auto">
              <RegisterVehicleForm />
            </div>
          )}
          
          {activeSection === 'vehicles' && <VehicleList />}
          
          {activeSection === 'municipal-contacts' && (
            <div className="max-w-2xl mx-auto">
              <MunicipalContactsForm />
            </div>
          )}
          
          {activeSection === 'terminals' && (
            <div className="max-w-2xl mx-auto">
              <TerminalForm />
            </div>
          )}
          
          {activeSection === 'municipality' && (
            <div className="max-w-2xl mx-auto">
              <MunicipalityForm />
            </div>
          )}
        </main>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!complaintToDelete} onOpenChange={() => setComplaintToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Complaint</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this complaint? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteComplaint} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
