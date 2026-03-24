"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { signOut, User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AdminHeader } from "@/components/admin-header";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Complaint } from "@/lib/types";
import { municipalities } from "@/lib/municipalities";

interface UserData {
  firstName: string;
  lastName: string;
  office: 'PSO' | 'Super Admin';
  profilePictureUrl?: string;
  municipality?: string;
}

interface ViolatorData {
  licensePlate: string;
  vehicleType: string;
  complaintCount: number;
  mostRecentIncident: string;
  incidentTypes: Record<string, number>;
  routes: string[];
}

function getMunicipalitiesFromRoute(route: string): string[] {
  if (!route) return [];
  const lowerCaseRoute = route.toLowerCase();
  return municipalities.filter(muni => 
    lowerCaseRoute.includes(muni.toLowerCase())
  );
}

function getDateRange(filterType: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (filterType) {
    case 'daily':
      start.setDate(end.getDate() - 1);
      break;
    case 'monthly':
      start.setMonth(end.getMonth() - 1);
      break;
    case 'yearly':
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      start.setMonth(end.getMonth() - 1);
  }

  return { start, end };
}

export default function ViolatorsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('monthly');
  const router = useRouter();

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
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, userData]);

  // Data processing for violators analysis

  // Filter complaints by date range
  const filteredByDateComplaints = useMemo(() => {
    const { start, end } = getDateRange(filterType);
    return complaints.filter(complaint => {
      try {
        // Try multiple date formats
        let complaintDate: Date | null = null;
        
        if (complaint.incidentDate && complaint.incidentDate !== 'No Date') {
          // Try parsing as ISO date first
          complaintDate = new Date(complaint.incidentDate);
          
          // If invalid, try parsing as M/d/yyyy format
          if (isNaN(complaintDate.getTime())) {
            const parts = complaint.incidentDate.split('/');
            if (parts.length === 3) {
              complaintDate = new Date(
                parseInt(parts[2]), // year
                parseInt(parts[0]) - 1, // month (0-indexed)
                parseInt(parts[1]) // day
              );
            }
          }
        }
        
        // If still invalid, use submitted date as fallback
        if (!complaintDate || isNaN(complaintDate.getTime())) {
          if (complaint.submittedDate && complaint.submittedDate !== 'No Date') {
            complaintDate = new Date(complaint.submittedDate);
          }
        }
        
        // If still no valid date, include the complaint (don't filter it out)
        if (!complaintDate || isNaN(complaintDate.getTime())) {
          return true;
        }
        
        return complaintDate >= start && complaintDate <= end;
      } catch (error) {
        console.warn('Date parsing error for complaint:', complaint.incidentDate, error);
        return true; // Include complaints with date parsing errors
      }
    });
  }, [complaints, filterType]);

  // Calculate violators
  const violators = useMemo(() => {
    const violatorMap: Record<string, ViolatorData> = {};

    filteredByDateComplaints.forEach(complaint => {
      const plate = complaint.licensePlate;
      if (!violatorMap[plate]) {
        violatorMap[plate] = {
          licensePlate: plate,
          vehicleType: complaint.vehicleType,
          complaintCount: 0,
          mostRecentIncident: complaint.incidentDate,
          incidentTypes: {},
          routes: [],
        };
      }

      violatorMap[plate].complaintCount += 1;
      violatorMap[plate].incidentTypes[complaint.incidentType] = 
        (violatorMap[plate].incidentTypes[complaint.incidentType] || 0) + 1;

      if (!violatorMap[plate].routes.includes(complaint.route)) {
        violatorMap[plate].routes.push(complaint.route);
      }

      // Update most recent incident
      try {
        const currentDate = new Date(violatorMap[plate].mostRecentIncident);
        const newDate = new Date(complaint.incidentDate);
        if (newDate > currentDate) {
          violatorMap[plate].mostRecentIncident = complaint.incidentDate;
        }
      } catch {
        // Keep existing date
      }
    });

    return Object.values(violatorMap)
      .sort((a, b) => b.complaintCount - a.complaintCount)
      .slice(0, 50); // Top 50 violators
  }, [filteredByDateComplaints]);

  const getSeverityBadge = (count: number) => {
    if (count >= 5) return <Badge className="bg-red-600">Critical</Badge>;
    if (count >= 3) return <Badge className="bg-orange-600">High</Badge>;
    if (count >= 2) return <Badge className="bg-yellow-600">Medium</Badge>;
    return <Badge className="bg-blue-600">Low</Badge>;
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!currentUser || !userData) {
    return <div className="flex h-screen items-center justify-center">Redirecting...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-green-500">Passengers</span>
                <span className="text-blue-500"> Map</span>
              </h1>
              <span className="ml-4 text-sm font-medium text-muted-foreground">Top Violators</span>
            </div>
            <AdminHeader userData={userData} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow overflow-auto container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="outline" size="sm" asChild>
            <Link href="/landing">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Landing
            </Link>
          </Button>
        </div>

        {/* Filter Section */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Last 24 Hours</SelectItem>
                  <SelectItem value="monthly">Last 30 Days</SelectItem>
                  <SelectItem value="yearly">Last 365 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground mt-6 sm:mt-2">
              <div>Showing {violators.length} violators with {filteredByDateComplaints.length} total complaints</div>
              <div className="text-xs">Total complaints loaded: {complaints.length}</div>
              <div className="text-xs">User municipality: {userData?.municipality || 'Not set'}</div>
            </div>
          </div>
        </Card>

        {/* Violators Table */}
        {violators.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-xs sm:text-sm">Rank</TableHead>
                    <TableHead className="text-xs sm:text-sm">License Plate</TableHead>
                    <TableHead className="text-xs sm:text-sm">Vehicle Type</TableHead>
                    <TableHead className="text-center text-xs sm:text-sm">Complaints</TableHead>
                    <TableHead className="text-xs sm:text-sm">Severity</TableHead>
                    <TableHead className="hidden md:table-cell text-xs sm:text-sm">Routes</TableHead>
                    <TableHead className="hidden lg:table-cell text-xs sm:text-sm">Latest Incident</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violators.map((violator, index) => (
                    <TableRow key={violator.licensePlate}>
                      <TableCell className="font-semibold text-xs sm:text-sm">#{index + 1}</TableCell>
                      <TableCell className="font-mono font-bold text-sm sm:text-lg">{violator.licensePlate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{violator.vehicleType}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-sm sm:text-lg text-red-600">{violator.complaintCount}</span>
                      </TableCell>
                      <TableCell>
                        {getSeverityBadge(violator.complaintCount)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="max-w-32 truncate text-xs">
                          {violator.routes.slice(0, 2).join(', ')}
                          {violator.routes.length > 2 && '...'}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {violator.mostRecentIncident}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
                        ) : (
          <Card className="p-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Violators Found</h3>
            <p className="text-muted-foreground">No violations were found in the selected time period.</p>
          </Card>
        )}
      </main>
    </div>
  );
}
