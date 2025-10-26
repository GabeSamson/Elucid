'use client';

import { useEffect, useState } from 'react';
import ImageUploader from '@/components/admin/ImageUploader';

interface CollectionHeroUploaderProps {
  defaultImageUrl?: string | null;
  inputName?: string;
}

export default function CollectionHeroUploader({
  defaultImageUrl = null,
  inputName = 'imageUrl',
}: CollectionHeroUploaderProps) {
  const [image, setImage] = useState<string | null>(defaultImageUrl);

  useEffect(() => {
    setImage(defaultImageUrl ?? null);
  }, [defaultImageUrl]);

  return (
    <div className="space-y-3">
      <input type="hidden" name={inputName} value={image ?? ''} />
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
