import { Suspense } from 'react';
import ComplaintDetails from '@/components/complaint-details';

export default function ComplaintPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ComplaintDetails />
    </Suspense>
  );
}
