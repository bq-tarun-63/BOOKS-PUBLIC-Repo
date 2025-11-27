"use client";

import { useState } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import { uploadCoverImage } from "@/components/tailwind/image-upload";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ImageUploadProps {
  /** Current image URL */
  imageUrl?: string;
  /** Callback when image is uploaded or changed */
  onImageChange: (url: string | null) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether the component is currently uploading */
  isUploading?: boolean;
  /** Maximum file size in MB (default: 5MB) */
  maxSizeMB?: number;
  /** Custom upload function. If not provided, uses default uploadCoverImage */
  onUpload?: (file: File) => Promise<string>;
  /** Upload parameters for default upload function */
  uploadParams?: { noteId?: string; parentId?: string };
  /** Aspect ratio class (default: "aspect-video") */
  aspectRatio?: string;
  /** Placeholder text when no image */
  placeholder?: string;
  /** Helper text below placeholder */
  helperText?: string;
  /** Badge to show on image (e.g., "Cover") */
  badge?: string;
  /** Custom className for the container */
  className?: string;
  /** Alt text for the image */
  alt?: string;
}

export function ImageUpload({
  imageUrl,
  onImageChange,
  disabled = false,
  isUploading: externalIsUploading,
  maxSizeMB = 5,
  onUpload,
  uploadParams,
  aspectRatio = "aspect-video",
  placeholder = "Upload image",
  helperText,
  badge,
  className,
  alt = "Uploaded image",
}: ImageUploadProps) {
  const [internalIsUploading, setInternalIsUploading] = useState(false);
  const isUploading = externalIsUploading ?? internalIsUploading;

  const handleImageUpload = async (file: File) => {
    if (disabled) return;

    // Validate file type
    if (!file.type.includes("image/")) {
      toast.error("File type not supported. Please upload an image file.");
      return;
    }

    // Validate file size
    if (file.size / 1024 / 1024 > maxSizeMB) {
      toast.error(`File size too big (max ${maxSizeMB}MB).`);
      return;
    }

    if (!externalIsUploading) {
      setInternalIsUploading(true);
    }

    try {
      let url: string;
      if (onUpload) {
        // Use custom upload function
        url = await onUpload(file);
      } else {
        // Use default upload function
        url = await uploadCoverImage(file, uploadParams);
      }
      onImageChange(url);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      if (!externalIsUploading) {
        setInternalIsUploading(false);
      }
    }
  };

  const handleRemoveImage = () => {
    if (disabled) return;
    onImageChange(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Reset input so same file can be selected again
    event.target.value = "";
  };

  return (
    <div
      className={cn(
        "relative group rounded-lg border-2 border-dashed overflow-hidden transition-colors",
        disabled
          ? "border-zinc-300 dark:border-zinc-700 opacity-60 cursor-not-allowed"
          : imageUrl
            ? "border-zinc-200 dark:border-zinc-700"
            : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600",
        className,
      )}
    >
      {imageUrl ? (
        <>
          <div className={cn("relative w-full bg-zinc-100 dark:bg-zinc-800", aspectRatio)}>
            <img src={imageUrl} alt={alt} className="w-full h-full object-cover" />
            {badge && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                {badge}
              </div>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {!disabled && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={disabled || isUploading}
                />
                <div className="px-3 py-1.5 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded border border-zinc-300 dark:border-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Replace
                </div>
              </label>
            </div>
          )}
        </>
      ) : (
        <label
          className={cn(
            "flex flex-col items-center justify-center w-full cursor-pointer transition-colors",
            aspectRatio,
            disabled && "cursor-not-allowed",
            !disabled && "hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
          )}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isUploading}
          />
          <div className="flex flex-col items-center gap-2 text-zinc-500 dark:text-zinc-400">
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-xs">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8" />
                <span className="text-xs font-medium">{placeholder}</span>
                {helperText && <span className="text-xs">{helperText}</span>}
              </>
            )}
          </div>
        </label>
      )}
    </div>
  );
}

