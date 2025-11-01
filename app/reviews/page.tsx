import { Suspense } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ReviewFormWithParams from '@/components/ReviewFormWithParams';

export const dynamic = 'force-dynamic';

export default function ReviewsPage() {
  return (
    <main className="min-h-screen bg-cream">
      <Suspense fallback={<div className="h-20" />}>
        <Navigation />
      </Suspense>
      <Suspense
        fallback={
          <div className="pt-32 pb-20 px-6 flex items-center justify-center">
            <div className="text-charcoal/60">Loading...</div>
          </div>
        }
      >
        <ReviewFormWithParams />
      </Suspense>
      <Footer />
    </main>
  );
}
