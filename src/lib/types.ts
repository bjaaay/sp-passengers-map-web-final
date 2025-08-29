export type Complaint = {
  id: string;
  incidentPhotoUrl: string;
  incidentPhotoAiHint: string;
  vehicleType: 'Jeepney' | 'Tricycle' | 'Trike' | 'Modern PUV' | 'Van';
  licensePlate: string;
  route: string;
  incidentTime: string;
  incidentDate: string;
  description: string;
  status: 'New' | 'Review' | 'Resolved';
};
 