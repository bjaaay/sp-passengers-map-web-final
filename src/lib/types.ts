
export type Complaint = {
  id: string;
  userId: string;
  incidentPhotoUrl: string;
  vehicleType: 'Jeepney' | 'Tricycle' | 'Trike' | 'Modern PUV' | 'UVExpress';
  licensePlate: string;
  route: string;
  incidentTime: string;
  incidentDate: string;
  description: string;
  status: 'New' | 'Review' | 'Resolved';
};

export type Vehicle = {
  plateNumber: string;
  vehicleType: string;
  gpsTrackerId: string;
  registrationDate: string;
  corUrl: string;
  orUrl: string;
};
