import { Suspense } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ReviewForm from '@/components/ReviewForm';

export const dynamic = 'force-dynamic';

export default function ReviewsPage() {
  return (
    <main className="min-h-screen bg-cream">
      <Suspense fallback={<div className="h-20" />}>
        <Navigation />
      </Suspense>
      <ReviewForm />
      <Footer />
    </main>
  );
}
