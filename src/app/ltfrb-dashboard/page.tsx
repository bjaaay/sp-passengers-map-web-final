
"use client";

import { LtfrbDashboard } from '@/components/ltfrb-dashboard';
import { AuthGuard } from '@/components/auth-guard';

export default function LtfrbDashboardPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-background">
        <LtfrbDashboard />
      </main>
    </AuthGuard>
  );
}
