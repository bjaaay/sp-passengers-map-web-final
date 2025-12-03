
"use client";

import { APIProvider } from '@vis.gl/react-google-maps';
import React from 'react';

export function MapsProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> Google Maps API key is missing.</span>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      {children}
    </APIProvider>
  );
}
