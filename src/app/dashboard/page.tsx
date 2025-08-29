import { ComplaintDashboard } from '@/components/complaint-dashboard';
import { NewReportDialog } from '@/components/new-report-dialog';
import { useState } from 'react';
import type { Complaint } from '@/lib/types';

export default function DashboardPage() {
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  const handleAddReport = (report: Complaint) => {
    setComplaints((prev) => [report, ...prev]);
  };
  return (
    <main className="min-h-screen bg-background">
      <ComplaintDashboard onNewReport={() => setIsNewReportOpen(true)} />
       <NewReportDialog
        isOpen={isNewReportOpen}
        onOpenChange={setIsNewReportOpen}
        onAddReport={handleAddReport}
      />
    </main>
  );
}
