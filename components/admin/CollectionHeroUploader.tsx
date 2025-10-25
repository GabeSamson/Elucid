'use client';

import { useState } from 'react';
import ImageUploader from '@/components/admin/ImageUploader';

export default function CollectionHeroUploader() {
  const [image, setImage] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <input type="hidden" name="imageUrl" value={image ?? ''} />
      <ImageUploader
        images={image ? [image] : []}
        onChange={(next) => setImage(next[0] ?? null)}
        maxImages={1}
        folder="collections"
      />
      <p className="text-xs text-charcoal/60">
        Upload a single banner image for the collection hero section.
      </p>
    </div>
  );
}
