
"use client";

import { useState, useMemo } from 'react';
import { Map, AdvancedMarker, Pin, MapMouseEvent } from '@vis.gl/react-google-maps';

interface MapPickerProps {
  onLocationSelect: (location: { lat: number; lng: number }) => void;
}

export function MapPicker({ onLocationSelect }: MapPickerProps) {
  const [selectedPlace, setSelectedPlace] = useState<google.maps.LatLngLiteral | null>(null);
  const position = useMemo(() => ({ lat: 14.5995, lng: 120.9842 }), []);

  const handleMapClick = (event: MapMouseEvent) => {
    if (event.detail.latLng) {
      const location = {
        lat: event.detail.latLng.lat,
        lng: event.detail.latLng.lng,
      };
      setSelectedPlace(location);
      onLocationSelect(location);
    }
  };

  return (
    <div style={{ height: '400px', width: '100%' }}>
      <Map
        defaultCenter={position}
        defaultZoom={12}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
        onClick={handleMapClick}
      >
        {selectedPlace && (
          <AdvancedMarker position={selectedPlace}>
            <Pin
              background={"#FBBC04"}
              borderColor={"#1e8e3e"}
              glyphColor={"#0f5925"}
            />
          </AdvancedMarker>
        )}
      </Map>
    </div>
  );
}
