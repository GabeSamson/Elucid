'use client';

import { useState } from 'react';

interface LockImagesUploaderProps {
  initialImages?: string[] | null;
  fieldName?: string;
  folder?: string;
  allowSvg?: boolean;
}

export default function LockImagesUploader({
  initialImages = [],
  fieldName = 'lockImages',
  folder = 'lock',
  allowSvg = true,
}: LockImagesUploaderProps) {
  const [images, setImages] = useState<string[]>(initialImages ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon', ...(allowSvg ? ['image/svg+xml'] : [])];
  const maxSize = 5 * 1024 * 1024;

  const handleUpload = async (file: File) => {
    if (!file) return;

    if (!validTypes.includes(file.type)) {
      setError(`Invalid file type. Allowed: ${allowSvg ? 'JPEG, PNG, WebP, ICO, SVG' : 'JPEG, PNG, WebP, ICO'}.`);
      return;
    }

    if (file.size > maxSize) {
      setError('File size too large. Maximum is 5MB.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setImages((prev) => [...prev, data.url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((img) => img !== url));
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name={fieldName} value={JSON.stringify(images)} />

      <div className="flex flex-wrap gap-3">
        {images.map((url) => (
          <div key={url} className="relative h-24 w-24 rounded-lg overflow-hidden border border-charcoal/10 bg-charcoal/80">
            <img src={url} alt="Lock screen" className="h-full w-full object-contain bg-charcoal" />
            <button
              type="button"
              onClick={() => removeImage(url)}
              className="absolute top-1 right-1 bg-charcoal-dark text-cream p-1 rounded-full shadow-sm"
              aria-label="Remove image"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <label className={`h-24 w-24 border-2 border-dashed border-charcoal/30 rounded-lg flex items-center justify-center text-xs text-charcoal cursor-pointer bg-white hover:border-charcoal/60 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <input
            type="file"
            accept={allowSvg ? 'image/*,.ico,.svg' : 'image/*,.ico'}
            className="hidden"
            onChange={handleFileInput}
            disabled={uploading}
          />
          {uploading ? 'Uploading...' : 'Add image'}
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
          {error}
        </div>
      )}
      <p className="text-xs text-charcoal/60">
        Images display on the locked homepage. SVGs are auto-whitened; max 5MB.
      </p>
    </div>
  );
}
