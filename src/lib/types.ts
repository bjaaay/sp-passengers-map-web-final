
export type Complaint = {
  id: string;
  userId: string;
  incidentPhotoUrls: string[];
  vehicleType: string;
  incidentType: string;
  licensePlate: string;
  route: string;
  incidentTime: string;
  incidentDate: string;
  description: string;
  status: 'New' | 'Pending' | 'Under Investigation' | 'Resolved';
  submittedDate: string;
  resolutionNotes?: string;
};

export type Vehicle = {
  userId: string;
  plateNumber: string;
  vehicleType: string;
  gpsTrackerId: string;
  registrationDate: string;
  corUrl: string;
  orUrl: string;
};
