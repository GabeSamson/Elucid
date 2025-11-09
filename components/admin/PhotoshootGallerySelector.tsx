'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface PhotoshootImage {
  id: string;
  title: string | null;
  imageUrl: string;
  displayOrder: number;
}

interface PhotoshootGallerySelectorProps {
  availableImages: PhotoshootImage[];
  selectedImageIds: string[];
  enableSlideshow: boolean;
  onSave: (imageIds: string[], enableSlideshow: boolean) => Promise<void>;
}

export default function PhotoshootGallerySelector({
  availableImages,
  selectedImageIds: initialSelectedIds,
  enableSlideshow: initialEnableSlideshow,
}: PhotoshootGallerySelectorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [enableSlideshow, setEnableSlideshow] = useState(initialEnableSlideshow);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const toggleImage = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaved(false);

    const formData = new FormData();
    formData.append('photoshootImages', JSON.stringify(selectedIds));
    formData.append('photoshootSlideshow', enableSlideshow ? 'on' : 'off');
    formData.append('formContext', 'photoshoot');

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/homepage/photoshoot', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        }
      } catch (error) {
        console.error('Failed to save:', error);
      }
    });
  };

  const selectedImages = availableImages.filter(img => selectedIds.includes(img.id));

  return (
    <div className="space-y-6">
      {availableImages.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-charcoal/20 rounded-lg">
          <p className="text-charcoal/60 mb-4">No images in gallery yet.</p>
          <Link
            href="/admin/gallery"
            className="inline-block px-6 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors"
          >
            Go to Gallery to Upload Images
          </Link>
        </div>
      ) : (
        <>
          {/* Selected Images Preview */}
          {selectedImages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-charcoal">
                  Selected for Homepage ({selectedImages.length})
                </h3>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-charcoal/60 hover:text-charcoal underline"
                >
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {selectedImages.map(image => (
                  <div key={image.id} className="relative aspect-square group">
                    <img
                      src={image.imageUrl}
                      alt={image.title || 'Selected'}
                      className="w-full h-full object-cover rounded border-2 border-charcoal"
                    />
                    <button
                      onClick={() => toggleImage(image.id)}
                      className="absolute top-1 right-1 bg-charcoal text-cream p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slideshow Option */}
          <div className="rounded-xl border border-charcoal/10 bg-white px-5 py-4">
            <label className="flex items-center gap-3 text-sm text-charcoal cursor-pointer">
              <input
                type="checkbox"
                checked={enableSlideshow}
                onChange={(e) => setEnableSlideshow(e.target.checked)}
                className="h-4 w-4 rounded border-charcoal/30 text-charcoal focus:ring-charcoal"
              />
              <div>
                <div className="font-medium">Enable slideshow</div>
                <div className="text-xs text-charcoal/60">
                  Automatically cycle through images every 5 seconds
                </div>
              </div>
            </label>
          </div>

          {/* Gallery Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-charcoal">
                Select Images from Gallery
              </h3>
              <Link
                href="/admin/gallery"
                className="text-xs text-charcoal/60 hover:text-charcoal underline"
              >
                Manage gallery
              </Link>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              <AnimatePresence>
                {availableImages.map(image => {
                  const isSelected = selectedIds.includes(image.id);
                  return (
                    <motion.button
                      key={image.id}
                      onClick={() => toggleImage(image.id)}
                      className={`relative aspect-square group transition-all ${
                        isSelected ? 'ring-2 ring-charcoal' : 'hover:ring-2 hover:ring-charcoal/50'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <img
                        src={image.imageUrl}
                        alt={image.title || 'Gallery image'}
                        className="w-full h-full object-cover rounded"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-charcoal/40 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-cream" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-white truncate">
                          {image.title || `Image ${image.displayOrder + 1}`}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Save Success Message */}
          {saved && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Homepage gallery updated successfully!
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/"
              className="px-6 py-3 border border-charcoal/30 text-charcoal rounded-lg hover:bg-charcoal/5 transition-colors"
            >
              Preview homepage
            </Link>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="px-7 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save homepage gallery'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
