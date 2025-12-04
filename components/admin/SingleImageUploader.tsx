'use client';

import { useState } from 'react';

interface SingleImageUploaderProps {
  currentImageUrl?: string | null;
  fieldName: string;
  folder: string;
  maxHeight?: string;
  acceptedFormats?: string;
  maxSizeText?: string;
}

export default function SingleImageUploader({
  currentImageUrl,
  fieldName,
  folder,
  maxHeight = 'max-h-48',
  acceptedFormats = 'PNG, JPG, WebP',
  maxSizeText = '5MB',
}: SingleImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImageUrl || '');
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, WebP, and ICO are allowed.');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File size too large. Maximum size is ${maxSizeText}.`);
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      setImageUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const removeImage = () => {
    setImageUrl('');
  };

  return (
    <div className="space-y-3">
      {/* Hidden input to store the URL for form submission */}
      <input type="hidden" name={fieldName} value={imageUrl} />

      {!imageUrl ? (
        // Upload Area
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
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
            accept="image/*,.ico"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />

          <div className="space-y-2">
            <svg
              className="mx-auto h-10 w-10 text-charcoal/50"
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
              {acceptedFormats} up to {maxSizeText}
            </p>
            {uploading && (
              <p className="text-xs text-charcoal/80 font-medium">Uploading...</p>
            )}
          </div>
        </div>
      ) : (
        // Image Preview
        <div className="relative group">
          <img
            src={imageUrl}
            alt="Uploaded image preview"
            className={`${maxHeight} rounded-lg border border-charcoal/10 mx-auto`}
          />
          <button
            onClick={removeImage}
            type="button"
            className="absolute top-2 right-2 bg-charcoal-dark text-cream p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove image"
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
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
          {error}
        </div>
      )}
    </div>
  );
}
