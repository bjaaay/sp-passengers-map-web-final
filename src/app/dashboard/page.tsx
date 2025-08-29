"use client";

import { ComplaintDashboard } from '@/components/complaint-dashboard';
import { AuthGuard } from '@/components/auth-guard';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-background">
        <ComplaintDashboard />
      </main>
    </AuthGuard>
  );
}
