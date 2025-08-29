"use client";

import { useState, useMemo } from 'react';
import type { Complaint } from '@/lib/types';
import { complaintsData } from '@/lib/data';
import { ComplaintCard } from './complaint-card';
import { NewReportDialog } from './new-report-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Logo } from './icons';
import { Download, PlusCircle, Search } from 'lucide-react';
import { DatePicker } from './date-picker';
import { AnimatePresence, motion } from 'framer-motion';

export function ComplaintDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>(complaintsData);
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  const addReport = (report: Complaint) => {
    setComplaints(prev => [report, ...prev]);
  };

  const updateReportStatus = (id: string, status: 'Resolved' | 'Pending') => {
    setComplaints(prev =>
      prev.map(c => (c.id === id ? { ...c, status } : c))
    );
  };

  const downloadReports = () => {
    const headers = Object.keys(complaints[0]).join(',');
    const csv = [
      headers,
      ...filteredComplaints.map(row =>
        Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'complaint_reports.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
      const dateMatch =
        !dateFilter || complaint.incidentDate === dateFilter.toISOString().split('T')[0];
      
      return searchMatch && statusMatch && vehicleMatch && dateMatch;
    });
  }, [complaints, searchTerm, statusFilter, vehicleTypeFilter, dateFilter]);

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Logo className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Complaint Central</h1>
            </div>
            <div className="flex items-center gap-2">
               <Button onClick={downloadReports} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button onClick={() => setIsNewReportOpen(true)} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Report
              </Button>
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
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Vehicles</SelectItem>
                  <SelectItem value="Car">Car</SelectItem>
                  <SelectItem value="Bus">Bus</SelectItem>
                  <SelectItem value="Truck">Truck</SelectItem>
                  <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                </SelectContent>
              </Select>
               <DatePicker date={dateFilter} setDate={setDateFilter} className="w-full sm:w-[240px]" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

      <NewReportDialog
        isOpen={isNewReportOpen}
        onOpenChange={setIsNewReportOpen}
        onAddReport={addReport}
      />
    </div>
  );
}
