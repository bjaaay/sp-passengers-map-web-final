export type Complaint = {
  id: string;
  incidentPhotoUrl: string;
  incidentPhotoAiHint: string;
  vehicleType: 'Car' | 'Bus' | 'Truck' | 'Motorcycle';
  licensePlate: string;
  route: string;
  incidentTime: string;
  incidentDate: string;
  description: string;
  status: 'Pending' | 'Resolved';
  complaintType: string;
};
