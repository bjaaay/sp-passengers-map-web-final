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
import { ArrowLeft } from "lucide-react";
import { municipalities } from "@/lib/municipalities";
import Link from "next/link";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import type { Complaint } from "@/lib/types";

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

  // Direct inclusion check against canonical list
  const directMatches = municipalities.filter(muni => lowerCaseRoute.includes(muni.toLowerCase()));
  if (directMatches.length > 0) return directMatches;

  // Tokenize route by common separators and try to match tokens to municipality names
  const tokens = route.split(/[-,\/|]+/).map(t => t.trim()).filter(Boolean);
  const normalizedMunicipalities = municipalities.map(m => ({
    raw: m,
    key: m.toLowerCase().replace(/\s+/g, '')
  }));

  const tokenMatches: string[] = [];
  tokens.forEach(token => {
    const key = token.toLowerCase().replace(/\s+/g, '');
    // Exact normalized match
    const exact = normalizedMunicipalities.find(n => n.key === key);
    if (exact) tokenMatches.push(exact.raw);
    else {
      // Substring match
      const sub = normalizedMunicipalities.find(n => n.key.includes(key) || key.includes(n.key));
      if (sub) tokenMatches.push(sub.raw);
    }
  });

  // Remove duplicates
  return Array.from(new Set(tokenMatches));
}

function getDateRange(period: 'daily' | 'monthly' | 'yearly') {
  const end = new Date();
  const start = new Date();
  if (period === 'daily') {
    start.setDate(end.getDate() - 1);
  } else if (period === 'monthly') {
    start.setMonth(end.getMonth() - 1);
  } else {
    start.setFullYear(end.getFullYear() - 1);
  }
  // Normalize times
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export default function AnalyticsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [summaryPeriod, setSummaryPeriod] = useState<'daily'|'monthly'|'yearly'|null>(null);
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [startInput, setStartInput] = useState<string>('');
  const [endInput, setEndInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
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
      console.log('Raw Firebase Data:', allReports); // Debug log
      if (allReports) {
        const loadedComplaints: Complaint[] = [];
        let skippedCount = 0;
        const skippedSamples: any[] = [];
        Object.keys(allReports).forEach(userId => {
          const userReports = allReports[userId];
          Object.keys(userReports).forEach(reportId => {
            const reportData = userReports[reportId];
            const route = reportData.route || '';

            // Build list of municipalities for this report: prefer explicit field, else parse from route
            let complaintMunicipalities: string[] = [];
            if (reportData.municipality) {
              if (Array.isArray(reportData.municipality)) {
                complaintMunicipalities = reportData.municipality.map((m: any) => String(m));
              } else {
                complaintMunicipalities = [String(reportData.municipality)];
              }
            } else {
              complaintMunicipalities = getMunicipalitiesFromRoute(route);
            }

            const normalizedComplaintMunicipalities = complaintMunicipalities.map(m => m.toLowerCase().trim()).filter(Boolean);
            const adminMuni = userData.municipality ? userData.municipality.toLowerCase().trim() : '';

            // Determine whether to include this report for the admin
            let includeReport = false;
            let skipReason = '';

            if (!adminMuni || userData.office === 'Super Admin') {
              // If admin has no municipality or is Super Admin, include all
              includeReport = true;
            } else {
              // If report has explicit municipality values
              if (normalizedComplaintMunicipalities.length > 0) {
                if (normalizedComplaintMunicipalities.includes(adminMuni)) {
                  includeReport = true;
                } else {
                  // also allow substring match (e.g., 'city' vs 'city name')
                  const substrMatch = normalizedComplaintMunicipalities.some(m => m.includes(adminMuni) || adminMuni.includes(m));
                  if (substrMatch) includeReport = true;
                }
              }

              // If still not included, check raw report.municipality string and route substring
              if (!includeReport) {
                if (reportData.municipality && typeof reportData.municipality === 'string') {
                  const rptM = reportData.municipality.toLowerCase();
                  if (rptM.includes(adminMuni) || adminMuni.includes(rptM)) includeReport = true;
                }
              }

              if (!includeReport) {
                const routeLower = String(route).toLowerCase();
                if (routeLower.includes(adminMuni)) includeReport = true;
              }
            }

            if (!includeReport) {
              skippedCount += 1;
              if (skippedSamples.length < 5) skippedSamples.push({ reportId, userId, reportData });
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
        console.log('Loaded Complaints:', loadedComplaints); // Debug log
        console.log('Admin municipality:', userData.municipality);
        console.log('Skipped reports count (municipality mismatch):', skippedCount);
        console.log('Skipped samples (showing route, report.municipality, parsedMunicipalities):', skippedSamples.map(s => ({
          reportId: s.reportId,
          userId: s.userId,
          route: s.reportData.route,
          reportMunicipality: s.reportData.municipality,
          parsedMunicipalities: getMunicipalitiesFromRoute(s.reportData.route),
        })));
        setComplaints(loadedComplaints);
        console.log('Loaded Complaints:', loadedComplaints); // Debug log
        setComplaints(loadedComplaints);
      } else {
        console.log('No reports found in database'); // Debug log
        setComplaints([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, userData]);

  // Analytics calculations and data processing

  // Data processing for charts
  const statusData = [
    { name: 'New', value: complaints.filter(c => c.status === 'New').length },
    { name: 'Pending', value: complaints.filter(c => c.status === 'Pending').length },
    { name: 'Under Investigation', value: complaints.filter(c => c.status === 'Under Investigation').length },
    { name: 'Resolved', value: complaints.filter(c => c.status === 'Resolved').length },
  ];

  const incidentTypeData = Object.entries(
    complaints.reduce((acc, c) => {
      acc[c.incidentType] = (acc[c.incidentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.replace(/_/g, ' ').toUpperCase(), value }));

  const vehicleTypeData = Object.entries(
    complaints.reduce((acc, c) => {
      acc[c.vehicleType] = (acc[c.vehicleType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Time series data - reports over time (daily)
  const reportsOverTime = useMemo(() => {
    const dateMap: Record<string, number> = {};
    
    complaints.forEach(complaint => {
      try {
        const date = new Date(complaint.incidentDate);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
      } catch {
        // Skip invalid dates
      }
    });

    return Object.entries(dateMap)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .slice(-30) // Last 30 days
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        reports: count,
      }));
  }, [complaints]);

  // Most common violation types with details
  const violationTypeDetails = useMemo(() => {
    const typeMap: Record<string, { count: number; percentage: number }> = {};
    
    complaints.forEach(complaint => {
      const type = complaint.incidentType;
      typeMap[type] = { count: (typeMap[type]?.count || 0) + 1, percentage: 0 };
    });

    const total = complaints.length || 1;
    Object.keys(typeMap).forEach(type => {
      typeMap[type].percentage = (typeMap[type].count / total) * 100;
    });

    return Object.entries(typeMap)
      .map(([type, data]) => ({
        type: type.replace(/_/g, ' ').toUpperCase(),
        count: data.count,
        percentage: Math.round(data.percentage),
      }))
      .sort((a, b) => b.count - a.count);
  }, [complaints]);

  // Peak reporting periods - by day of week
  const peakByDayOfWeek = useMemo(() => {
    const dayMap: Record<number, number> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    complaints.forEach(complaint => {
      try {
        const date = new Date(complaint.incidentDate);
        const dayOfWeek = date.getDay();
        dayMap[dayOfWeek] = (dayMap[dayOfWeek] || 0) + 1;
      } catch {
        // Skip invalid dates
      }
    });

    return Object.entries(dayMap)
      .map(([day, count]) => ({
        day: dayNames[parseInt(day)],
        reports: count,
      }))
      .sort((a, b) => b.reports - a.reports);
  }, [complaints]);

  // Peak reporting periods - by hour of day
  const peakByHour = useMemo(() => {
    const hourMap: Record<number, number> = {};
    
    complaints.forEach(complaint => {
      try {
        const time = complaint.incidentTime;
        if (time && time !== 'No Time') {
          const hour = parseInt(time.split(':')[0]);
          if (!isNaN(hour)) {
            hourMap[hour] = (hourMap[hour] || 0) + 1;
          }
        }
      } catch {
        // Skip invalid times
      }
    });

    const hoursArray = Array.from({ length: 24 }, (_, i) => i);
    return hoursArray
      .map(hour => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        reports: hourMap[hour] || 0,
      }))
      .filter(item => item.reports > 0)
      .sort((a, b) => b.reports - a.reports)
      .slice(0, 12);
  }, [complaints]);

  // Summary computation for chosen period
  const summary = useMemo(() => {
    if (!summaryPeriod && !customRange) return null;
    let start: Date; let end: Date;
    if (customRange) {
      start = new Date(customRange.start);
      end = new Date(customRange.end);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
    } else {
      const r = getDateRange(summaryPeriod as 'daily'|'monthly'|'yearly');
      start = r.start; end = r.end;
    }
    const filtered = complaints.filter(c => {
      try {
        const d = new Date(c.incidentDate);
        return d >= start && d <= end;
      } catch {
        return false;
      }
    });

    const incidentCounts: Record<string, number> = {};
    const plateCounts: Record<string, number> = {};
    filtered.forEach(c => {
      incidentCounts[c.incidentType] = (incidentCounts[c.incidentType] || 0) + 1;
      const plate = c.licensePlate || 'UNKNOWN';
      plateCounts[plate] = (plateCounts[plate] || 0) + 1;
    });

    const topIncidents = Object.entries(incidentCounts)
      .map(([k, v]) => ({ type: k.replace(/_/g, ' '), count: v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topPlates = Object.entries(plateCounts)
      .map(([k, v]) => ({ plate: k, count: v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { period: summaryPeriod, totalReports: filtered.length, topIncidents, topPlates };
  }, [summaryPeriod, complaints, customRange]);
  
  const clearCustomRange = () => {
    setCustomRange(null);
    setStartInput('');
    setEndInput('');
  };

  function downloadCSV(filename: string, csv: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const exportSummaryCSV = (summaryObj: any) => {
    if (!summaryObj) return;
    let rows: string[] = [];
    rows.push([`Period: ${summaryObj.period}`, `Total Reports: ${summaryObj.totalReports}`].join(','));
    rows.push('');
    rows.push('Top Incidents');
    rows.push('Incident,Count');
    summaryObj.topIncidents.forEach((it: any) => rows.push([`"${it.type}"`, it.count].join(',')));
    rows.push('');
    rows.push('Top License Plates');
    rows.push('Plate,Count');
    summaryObj.topPlates.forEach((p: any) => rows.push([`"${p.plate}"`, p.count].join(',')));
    const csv = rows.join('\n');
    const filename = `summary_${summaryObj.period}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(filename, csv);
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
              <span className="ml-4 text-sm font-medium text-muted-foreground">Analytics & Reports</span>
            </div>
            <AdminHeader userData={userData} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow overflow-auto container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/landing">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Landing
            </Link>
          </Button>
        </div>

        {/* Total Complaints Card */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-bold mb-2">Total Complaints</h2>
          <p className="text-5xl font-bold text-blue-600">{complaints.length}</p>
          {complaints.length === 0 && (
            <p className="text-sm text-amber-600 mt-4 font-semibold">
              ⚠️ No complaints found. Check browser console (F12) for debug information, or wait for a mobile user to submit a report.
            </p>
          )}
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {complaints.length === 0 && (
            <Card className="col-span-1 lg:col-span-2 p-6 border-amber-200 bg-amber-50">
              <h3 className="text-lg font-semibold mb-4 text-amber-900">Debugging Information</h3>
              <div className="space-y-3 text-sm text-amber-800">
                <p><strong>Current Status:</strong> No complaint data available</p>
                <p><strong>What to check:</strong></p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Open browser Developer Tools (Press <kbd className="bg-white px-2 py-1 rounded">F12</kbd>)</li>
                  <li>Go to the <strong>Console</strong> tab</li>
                  <li>Look for "Raw Firebase Data" log to see if data exists in the database</li>
                  <li>Check that reports are stored in the format: <code className="bg-white px-1 rounded text-xs">reports → userId → reportId → {'{date, time, ...}'}</code></li>
                  <li>Ensure your user's municipality matches routes in the complaints</li>
                  <li>If no data appears, ask a mobile user to submit a complaint report</li>
                </ul>
                <p className="mt-4 text-amber-700"><strong>Expected Data Fields:</strong> date, time, vehicleType, incidentType, plate, route, description</p>
              </div>
            </Card>
          )}
          
          {/* Reports Over Time - Line Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reports Over Time (Last 30 Days)</h3>
            {reportsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="reports" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    name="Reports"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </Card>

          {/* Status Distribution - Pie Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Complaints by Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Most Common Violations */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Most Common Violation Types</h3>
            {violationTypeDetails.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={violationTypeDetails.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 200 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="type" type="category" width={190} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </Card>

          {/* Incident Type Distribution - Bar Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Complaints by Incident Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incidentTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Peak Reporting Hours */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Peak Reporting Hours</h3>
            {peakByHour.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakByHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="reports" fill="#f59e0b" name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No time data available
              </div>
            )}
          </Card>

          {/* Peak Reporting Days */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reports by Day of Week</h3>
            {peakByDayOfWeek.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakByDayOfWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="reports" fill="#8b5cf6" name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </Card>

          {/* Vehicle Type Distribution - Pie Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Complaints by Vehicle Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={vehicleTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {vehicleTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Statistics Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Statistics Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                <span className="font-medium">Total Complaints</span>
                <span className="text-2xl font-bold text-blue-600">{complaints.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                <span className="font-medium">Resolved</span>
                <span className="text-2xl font-bold text-green-600">{complaints.filter(c => c.status === 'Resolved').length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                <span className="font-medium">Under Investigation</span>
                <span className="text-2xl font-bold text-orange-600">{complaints.filter(c => c.status === 'Under Investigation').length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <span className="font-medium">New</span>
                <span className="text-2xl font-bold text-red-600">{complaints.filter(c => c.status === 'New').length}</span>
              </div>
            </div>
          </Card>

          {/* Trend Insights */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Trend Insights</h3>
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 rounded">
                <p className="text-sm font-medium text-purple-900">Most Common Violation</p>
                <p className="text-lg font-bold text-purple-600">
                  {violationTypeDetails.length > 0 ? violationTypeDetails[0].type : 'N/A'}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {violationTypeDetails.length > 0 ? `${violationTypeDetails[0].count} reports (${violationTypeDetails[0].percentage}%)` : ''}
                </p>
              </div>
              <div className="p-3 bg-indigo-50 rounded">
                <p className="text-sm font-medium text-indigo-900">Peak Reporting Day</p>
                <p className="text-lg font-bold text-indigo-600">
                  {peakByDayOfWeek.length > 0 ? peakByDayOfWeek[0].day : 'N/A'}
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  {peakByDayOfWeek.length > 0 ? `${peakByDayOfWeek[0].reports} reports` : ''}
                </p>
              </div>
              <div className="p-3 bg-cyan-50 rounded">
                <p className="text-sm font-medium text-cyan-900">Peak Reporting Hour</p>
                <p className="text-lg font-bold text-cyan-600">
                  {peakByHour.length > 0 ? peakByHour[0].hour : 'N/A'}
                </p>
                <p className="text-xs text-cyan-600 mt-1">
                  {peakByHour.length > 0 ? `${peakByHour[0].reports} reports` : ''}
                </p>
              </div>
            </div>
          </Card>
          
          {/* Summary Generator */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Generate Summary</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 items-center">
              <div className="col-span-1 flex flex-wrap gap-2">
                <Button className="whitespace-nowrap" onClick={() => { setSummaryPeriod('daily'); setCustomRange(null); }}>Daily</Button>
                <Button className="whitespace-nowrap" onClick={() => { setSummaryPeriod('monthly'); setCustomRange(null); }}>Monthly</Button>
                <Button className="whitespace-nowrap" onClick={() => { setSummaryPeriod('yearly'); setCustomRange(null); }}>Yearly</Button>
                <Button className="whitespace-nowrap" variant="outline" onClick={() => { setSummaryPeriod(null); clearCustomRange(); }}>Clear</Button>
              </div>

              <div className="col-span-2 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm">From</label>
                  <input type="date" value={startInput} onChange={e => setStartInput(e.target.value)} className="input input-sm max-w-[160px]" />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm">To</label>
                  <input type="date" value={endInput} onChange={e => setEndInput(e.target.value)} className="input input-sm max-w-[160px]" />
                </div>

                <div className="flex items-center gap-2 ml-auto lg:ml-0">
                  <Button className="whitespace-nowrap" onClick={() => {
                    if (startInput && endInput) {
                      setCustomRange({ start: startInput, end: endInput });
                      setSummaryPeriod(null);
                    }
                  }}>Generate Custom</Button>
                  <Button variant="ghost" onClick={() => clearCustomRange()}>Reset</Button>
                </div>
              </div>
            </div>

            {summary ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Showing summary for <strong>{summary.period}</strong> — {summary.totalReports} reports</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Top Incidents</h4>
                    <ul className="mt-2 space-y-2">
                      {summary.topIncidents.map((it, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{it.type}</span>
                          <span className="font-semibold">{it.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium">Top License Plates</h4>
                    <ul className="mt-2 space-y-2">
                      {summary.topPlates.map((p, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span className="font-mono">{p.plate}</span>
                          <span className="font-semibold">{p.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => exportSummaryCSV(summary)}>Export CSV</Button>
                  <Button onClick={() => {
                    // compute start/end from selected period or custom range and navigate to reports page
                    let s: Date | null = null; let e: Date | null = null;
                    if (customRange) {
                      s = new Date(customRange.start);
                      e = new Date(customRange.end);
                    } else if (summaryPeriod) {
                      const r = getDateRange(summaryPeriod as 'daily'|'monthly'|'yearly');
                      s = r.start; e = r.end;
                    }
                    const fmt = (d: Date | null) => d ? d.toISOString().split('T')[0] : '';
                    const sStr = fmt(s); const eStr = fmt(e);
                    const url = `/analytics/reports${sStr && eStr ? `?start=${sStr}&end=${eStr}` : ''}`;
                    router.push(url);
                  }}>Generate Reports</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a period to generate a summary.</p>
            )}
          </Card>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8 mb-8">
          <Button asChild className="flex-1">
            <Link href="/landing">Return to Landing</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
