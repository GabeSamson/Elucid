'use client';

import { useState, useTransition } from 'react';
import ImageUploader from './ImageUploader';
import Link from 'next/link';

interface PhotoshootGalleryEditorProps {
  initialImages: string[];
  onSave: (images: string[]) => Promise<void>;
}

export default function PhotoshootGalleryEditor({
  initialImages,
  onSave,
}: PhotoshootGalleryEditorProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaved(false);
    startTransition(async () => {
      await onSave(images);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-charcoal">
          Gallery Images
        </label>
        <ImageUploader
          images={images}
          onChange={setImages}
          maxImages={20}
          folder="photoshoot"
        />
        <p className="mt-2 text-xs text-charcoal/60">
          Upload images for your homepage photoshoot gallery. Images will be displayed in the order they appear here.
        </p>
      </div>

      {saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Gallery images saved successfully!
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Link
          href="/"
          className="px-6 py-3 border border-charcoal/30 text-charcoal rounded-lg hover:bg-charcoal/5 transition-colors"
        >
          Preview homepage
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-7 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save gallery images'}
        </button>
      </div>
    </div>
  );
}
