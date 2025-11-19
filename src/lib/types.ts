
export type Complaint = {
  id: string;
  userId: string;
  incidentPhotoUrl: string;
  vehicleType: 'Jeepney' | 'Tricycle' | 'E-trike' | 'Modern PUV' | 'UV Express';
  licensePlate: string;
  route: string;
  incidentTime: string;
  incidentDate: string;
  description: string;
  status: 'New' | 'Review' | 'Resolved';
  submittedDate: string;
};

export type Vehicle = {
  plateNumber: string;
  vehicleType: string;
  gpsTrackerId: string;
  registrationDate: string;
  corUrl: string;
  orUrl: string;
};
