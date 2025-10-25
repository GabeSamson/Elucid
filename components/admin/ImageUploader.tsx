'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  folder?: 'products' | 'collections';
}

export default function ImageUploader({
  images,
  onChange,
  maxImages = 10,
  folder = 'products',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const response = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Upload failed');
        }

        const data = await response.json();
        return data.url;
      });

      const urls = await Promise.all(uploadPromises);
      onChange([...images, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files);
    }
  }, [images, maxImages]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(e.target.files);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          dragActive
            ? 'border-charcoal bg-cream-light'
            : 'border-charcoal/30 hover:border-charcoal/50'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />

        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-charcoal/50"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-sm text-charcoal">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </div>
          <p className="text-xs text-charcoal/60">
            PNG, JPG, WebP up to 5MB (max {maxImages} images)
          </p>
          {uploading && (
            <p className="text-xs text-charcoal/80 font-medium">Uploading...</p>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-cream-dark border border-charcoal rounded-lg text-sm text-charcoal-dark">
          {error}
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AnimatePresence>
            {images.map((url, index) => (
              <motion.div
                key={url}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group aspect-square"
              >
                <img
                  src={url}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-charcoal/20"
                />

                {/* Primary Badge */}
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-charcoal text-cream text-xs px-2 py-1 rounded">
                    Primary
                  </div>
                )}

                {/* Remove Button */}
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-charcoal-dark text-cream p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  type="button"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {/* Reorder Buttons */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {index > 0 && (
                    <button
                      onClick={() => reorderImages(index, index - 1)}
                      className="bg-charcoal text-cream p-1 rounded text-xs"
                      type="button"
                      title="Move left"
                    >
                      ←
                    </button>
                  )}
                  {index < images.length - 1 && (
                    <button
                      onClick={() => reorderImages(index, index + 1)}
                      className="bg-charcoal text-cream p-1 rounded text-xs"
                      type="button"
                      title="Move right"
                    >
                      →
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
