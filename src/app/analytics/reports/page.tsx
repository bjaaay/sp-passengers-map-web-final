export const dynamic = "force-dynamic";

import React from "react";
import ReportsClient from "./ReportsClient";

// top-level server component: renders Suspense boundary around client logic
export default function ReportsPage() {
  return (
    <React.Suspense fallback={<div className="flex h-screen items-center justify-center">Loading reports...</div>}>
      <ReportsClient />
    </React.Suspense>
  );
}
