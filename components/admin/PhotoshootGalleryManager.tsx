'use client';

import { useState, useTransition } from 'react';
import ImageUploader from './ImageUploader';
import { motion, AnimatePresence } from 'framer-motion';

interface PhotoshootImage {
  id: string;
  title: string | null;
  imageUrl: string;
  displayOrder: number;
  active: boolean;
  showInSlideshow: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PhotoshootGalleryManagerProps {
  images: PhotoshootImage[];
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, title: string) => Promise<void>;
  onToggleSlideshow: (id: string, showInSlideshow: boolean) => Promise<void>;
  onReorder: (imageIds: string[]) => Promise<void>;
  onCreate: (imageUrl: string, title?: string) => Promise<void>;
}

export default function PhotoshootGalleryManager({
  images: initialImages,
  onDelete,
  onUpdate,
  onToggleSlideshow,
  onReorder,
  onCreate,
}: PhotoshootGalleryManagerProps) {
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Create optimistic list of images
  const [images, setImages] = useState(initialImages);

  const handleUploadComplete = async () => {
    if (uploadedUrls.length === 0) return;

    startTransition(async () => {
      // Create all uploaded images
      for (const url of uploadedUrls) {
        await onCreate(url);
      }
      setUploadedUrls([]);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    startTransition(async () => {
      await onDelete(id);
      setImages(images.filter(img => img.id !== id));
    });
  };

  const handleEditTitle = (image: PhotoshootImage) => {
    setEditingId(image.id);
    setEditTitle(image.title || '');
  };

  const handleSaveTitle = () => {
    if (!editingId) return;

    startTransition(async () => {
      await onUpdate(editingId, editTitle);
      setImages(images.map(img =>
        img.id === editingId ? { ...img, title: editTitle } : img
      ));
      setEditingId(null);
    });
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);

    setImages(newImages);

    startTransition(async () => {
      await onReorder(newImages.map(img => img.id));
    });
  };

  const handleToggleSlideshow = (id: string, currentValue: boolean) => {
    const newValue = !currentValue;

    // Optimistically update UI
    setImages(images.map(img =>
      img.id === id ? { ...img, showInSlideshow: newValue } : img
    ));

    startTransition(async () => {
      await onToggleSlideshow(id, newValue);
    });
  };

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <section className="rounded-2xl border border-charcoal/10 bg-cream p-6 space-y-4">
        <header>
          <h2 className="text-xl font-semibold text-charcoal">Upload Images</h2>
          <p className="text-sm text-charcoal/70">
            Add new images to your photoshoot gallery.
          </p>
        </header>

        <ImageUploader
          images={uploadedUrls}
          onChange={setUploadedUrls}
          maxImages={20}
          folder="photoshoot"
        />

        {uploadedUrls.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleUploadComplete}
              disabled={isPending}
              className="px-6 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Adding to gallery...' : `Add ${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} to gallery`}
            </button>
          </div>
        )}
      </section>

      {/* Gallery Images */}
      <section className="rounded-2xl border border-charcoal/10 bg-cream p-6 space-y-4">
        <header>
          <h2 className="text-xl font-semibold text-charcoal">Gallery Images ({images.length})</h2>
          <p className="text-sm text-charcoal/70">
            Manage and reorder your gallery images. Drag to reorder.
          </p>
        </header>

        {images.length === 0 ? (
          <div className="text-center py-12 text-charcoal/60">
            <p>No images in gallery yet. Upload some images above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {images.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group rounded-lg border border-charcoal/20 overflow-hidden bg-white"
                >
                  <div className="aspect-square relative">
                    <img
                      src={image.imageUrl}
                      alt={image.title || `Photoshoot ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Overlay with controls */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEditTitle(image)}
                        className="px-3 py-2 bg-white text-charcoal rounded text-sm hover:bg-cream transition-colors"
                        type="button"
                      >
                        Edit Title
                      </button>
                      <button
                        onClick={() => handleDelete(image.id)}
                        className="px-3 py-2 bg-charcoal-dark text-cream rounded text-sm hover:bg-black transition-colors"
                        type="button"
                      >
                        Delete
                      </button>
                    </div>

                    {/* Reorder buttons */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {index > 0 && (
                        <button
                          onClick={() => handleReorder(index, index - 1)}
                          className="bg-charcoal text-cream p-1.5 rounded text-xs"
                          type="button"
                          title="Move left"
                        >
                          ←
                        </button>
                      )}
                      {index < images.length - 1 && (
                        <button
                          onClick={() => handleReorder(index, index + 1)}
                          className="bg-charcoal text-cream p-1.5 rounded text-xs"
                          type="button"
                          title="Move right"
                        >
                          →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title and Controls */}
                  <div className="p-3 bg-white space-y-2">
                    {editingId === image.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="input-modern flex-1 text-sm"
                          placeholder="Image title"
                        />
                        <button
                          onClick={handleSaveTitle}
                          className="px-3 py-1 bg-charcoal text-cream rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 border border-charcoal/30 text-charcoal rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-charcoal font-medium truncate">
                        {image.title || `Photoshoot ${index + 1}`}
                      </p>
                    )}

                    {/* Homepage Slideshow Toggle */}
                    <label className="flex items-center gap-2 text-xs text-charcoal/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={image.showInSlideshow}
                        onChange={() => handleToggleSlideshow(image.id, image.showInSlideshow)}
                        className="rounded border-charcoal/30"
                      />
                      <span>Show in homepage slideshow</span>
                    </label>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}
