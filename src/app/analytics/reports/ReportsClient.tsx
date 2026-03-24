"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth, database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { signOut, User } from "firebase/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { municipalities } from "@/lib/municipalities";

function getMunicipalitiesFromRoute(route: string): string[] {
  if (!route) return [];
  const lowerCaseRoute = route.toLowerCase();
  const directMatches = municipalities.filter(m => lowerCaseRoute.includes(m.toLowerCase()));
  if (directMatches.length > 0) return directMatches;
  const tokens = route.split(/[-,\/|]+/).map(t => t.trim()).filter(Boolean);
  const normalized = municipalities.map(m => ({ raw: m, key: m.toLowerCase().replace(/\s+/g, '') }));
  const tokenMatches: string[] = [];
  tokens.forEach(token => {
    const key = token.toLowerCase().replace(/\s+/g, '');
    const exact = normalized.find(n => n.key === key);
    if (exact) tokenMatches.push(exact.raw);
    else {
      const sub = normalized.find(n => n.key.includes(key) || key.includes(n.key));
      if (sub) tokenMatches.push(sub.raw);
    }
  });
  return Array.from(new Set(tokenMatches));
}

export default function ReportsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [userData, setUserData] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUser(user);
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, snap => {
          if (snap.exists()) setUserData(snap.val());
        });
      } else {
        router.push('/');
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!currentUser || !userData) return;
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const start = startParam ? new Date(startParam) : null;
    const end = endParam ? new Date(endParam) : null;
    if (start) start.setHours(0,0,0,0);
    if (end) end.setHours(23,59,59,999);

    const reportsRef = ref(database, 'reports');
    const unsub = onValue(reportsRef, snapshot => {
      const all = snapshot.val();
      const loaded: any[] = [];
      if (!all) {
        setReports([]);
        setIsLoading(false);
        return;
      }
      Object.keys(all).forEach(userId => {
        const userReports = all[userId] || {};
        Object.keys(userReports).forEach(reportId => {
          const r = userReports[reportId];
          const route = r.route || '';
          let complaintMunicipalities: string[] = [];
          if (r.municipality) {
            if (Array.isArray(r.municipality)) complaintMunicipalities = r.municipality.map((m:any)=>String(m));
            else complaintMunicipalities = [String(r.municipality)];
          } else {
            complaintMunicipalities = getMunicipalitiesFromRoute(route);
          }
          const normalizedComplaintMunicipalities = complaintMunicipalities.map((m:any)=>m.toLowerCase().trim()).filter(Boolean);
          const adminMuni = userData.municipality ? userData.municipality.toLowerCase().trim() : '';
          let include = false;
          if (!adminMuni || userData.office === 'Super Admin') include = true;
          else {
            if (normalizedComplaintMunicipalities.length>0) {
              if (normalizedComplaintMunicipalities.includes(adminMuni)) include = true;
              else {
                const substr = normalizedComplaintMunicipalities.some((m:any)=> m.includes(adminMuni) || adminMuni.includes(m));
                if (substr) include = true;
              }
            }
            if (!include && r.municipality && typeof r.municipality === 'string') {
              const rptM = r.municipality.toLowerCase();
              if (rptM.includes(adminMuni) || adminMuni.includes(rptM)) include = true;
            }
            if (!include) {
              const routeLower = String(route).toLowerCase();
              if (routeLower.includes(adminMuni)) include = true;
            }
          }
          if (!include) return;

          // Date filter
          if (start || end) {
            const d = r.date ? new Date(r.date) : (r.timestamp ? new Date(r.timestamp) : null);
            if (!d) return;
            if (start && d < start) return;
            if (end && d > end) return;
          }

          // Calculate submitted date
          let finalSubmittedDate = 'No Date';
          if (r.timestamp) {
            finalSubmittedDate = new Date(r.timestamp).toLocaleDateString();
          } else if (r.date) {
            finalSubmittedDate = r.date;
          }

          loaded.push({ id: reportId, userId, submittedDate: finalSubmittedDate, ...r });
        });
      });
      setReports(loaded);
      setIsLoading(false);
    });
    return () => unsub();
  }, [currentUser, userData, searchParams]);

  function downloadCSV(filename: string, csv: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.setAttribute('download', filename); document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  const exportAllCSV = () => {
    if (!reports) return;
    const rows: string[] = [];
    // header (exclude Report ID and User ID for front-end exports)
    rows.push(['License Plate','Vehicle Type','Incident Type','Date','Time','Route','Status','Submitted Date','Description'].join(','));
    reports.forEach(r => {
      const line = [
        `"${(r.plate||r.licensePlate||'').toString().replace(/"/g,'""')}"`,
        `"${(r.vehicleType||'').toString().replace(/"/g,'""')}"`,
        `"${(r.incidentType||'').toString().replace(/"/g,'""')}"`,
        `"${(r.date||'').toString()}"`,
        `"${(r.time||'').toString()}"`,
        `"${(r.route||'').toString().replace(/"/g,'""')}"`,
        `"${(r.status||'').toString().replace(/"/g,'""')}"`,
        `"${(r.submittedDate||'').toString().replace(/"/g,'""')}"`,
        `"${(r.description||'').toString().replace(/"/g,'""')}"`,
      ].join(',');
      rows.push(line);
    });
    const filename = `reports_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(filename, rows.join('\n'));
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading reports...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Generated Reports</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Back</Button>
          <Button onClick={exportAllCSV}>Export All CSV</Button>
          <Button onClick={() => setShowModal(true)}>Export PDF</Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">Showing {reports.length} reports. Images and resolution notes are excluded from export.</p>

      <div className="grid grid-cols-1 gap-4">
        {reports.map(r => (
          <Card key={r.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{r.plate || r.licensePlate || 'No Plate'}</h3>
                <p className="text-sm text-muted-foreground">{r.vehicleType || 'Unknown'} • {r.incidentType || 'Unknown'}</p>
                <p className="text-sm mt-2">{r.description || 'No description'}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div><strong>{r.date || r.incidentDate || 'No Date'}</strong></div>
                <div>{r.time || r.incidentTime || 'No Time'}</div>
                <div className="mt-2">{r.status || 'New'}</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Route: {r.route || 'No Route'}</div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div ref={modalRef} className="relative bg-white w-[95%] h-[90%] overflow-auto rounded shadow-lg p-6 print-area">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                .print-area, .print-area * { visibility: visible; }
                .print-area { position: absolute; left: 0; top: 0; width: 100%; }
              }
            `}</style>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-semibold">Generated Reports</h1>
                <div className="text-sm text-muted-foreground">Total reports: {reports.length}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowModal(false)}>Close</Button>
                <Button onClick={() => window.print()}>Print / Save as PDF</Button>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border p-2 text-left">Plate</th>
                    <th className="border p-2 text-left">Vehicle Type</th>
                    <th className="border p-2 text-left">Incident Type</th>
                    <th className="border p-2 text-left">Date</th>
                    <th className="border p-2 text-left">Time</th>
                    <th className="border p-2 text-left">Route</th>
                    <th className="border p-2 text-left">Status</th>
                    <th className="border p-2 text-left">Submitted Date</th>
                    <th className="border p-2 text-left">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td className="border p-2 align-top">{r.plate || r.licensePlate}</td>
                      <td className="border p-2 align-top">{r.vehicleType}</td>
                      <td className="border p-2 align-top">{r.incidentType}</td>
                      <td className="border p-2 align-top">{r.date || r.incidentDate}</td>
                      <td className="border p-2 align-top">{r.time || r.incidentTime}</td>
                      <td className="border p-2 align-top">{r.route}</td>
                      <td className="border p-2 align-top">{r.status}</td>
                      <td className="border p-2 align-top">{r.submittedDate}</td>
                      <td className="border p-2 align-top">{r.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
