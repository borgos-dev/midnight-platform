"use client";

import { useState, useRef } from "react";
import Image from "next/image";

type UploadResult = {
  url: string;
  publicId: string;
  mediaType: "IMAGE" | "VIDEO";
};

type Props = {
  type?: "avatar" | "post";
  onUploadComplete: (result: UploadResult) => void;
  accept?: string;
};

export function MediaUpload({
  type = "post",
  onUploadComplete,
  accept = "image/*,video/*",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setProgress(0);

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Upload failed");
      }

      onUploadComplete({
        url: data.url,
        publicId: data.publicId,
        mediaType: data.mediaType,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="relative flex flex-col items-center justify-center w-full min-h-[160px] rounded-xl border-2 border-dashed border-white/10 bg-white/2 hover:bg-white/4 hover:border-purple-500/30 transition cursor-pointer overflow-hidden"
      >
        {/* Preview */}
        {preview && !uploading && (
          <div className="absolute inset-0">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover opacity-60 rounded-xl"
            />
          </div>
        )}

        {/* Upload state */}
        <div className="relative z-10 flex flex-col items-center gap-2 p-6 text-center">
          {uploading ? (
            <>
              <div className="text-2xl animate-pulse">â³</div>
              <p className="text-[12px] text-white/50">
                Uploading... {progress}%
              </p>
              {/* Progress bar */}
              <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : preview ? (
            <>
              <div className="text-2xl">âœ…</div>
              <p className="text-[12px] text-white/50">
                Upload complete â€” click to change
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl">ðŸ“</div>
              <p className="text-[12px] text-white/60 font-medium">
                Click or drag to upload
              </p>
              <p className="text-eyebrow text-white/25">
                {type === "avatar"
                  ? "JPG, PNG, WebP â€” max 10MB"
                  : "Images up to 10MB Â· Videos up to 100MB"
                }
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-label text-red-400">
          âš ï¸ {error}
        </p>
      )}

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}