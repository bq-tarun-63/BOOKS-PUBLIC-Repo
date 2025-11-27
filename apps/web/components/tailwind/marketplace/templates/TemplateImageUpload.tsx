"use client";

import { useState } from "react";
import { ImageUpload } from "@/components/tailwind/common/ImageUpload";

interface TemplateImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  disabled?: boolean;
  maxImages?: number;
  templateId?: string | null;
}

export function TemplateImageUpload({
  images,
  onImagesChange,
  disabled = false,
  maxImages = 5,
  templateId,
}: TemplateImageUploadProps) {
  // Generate a unique ID for this template's images
  // Use templateId if available, otherwise generate a unique ID that persists for this component instance
  const [uniqueId] = useState(() => {
    return templateId ? `template-${templateId}` : `template-${crypto.randomUUID()}`;
  });
  const handleImageChange = (index: number, url: string | null) => {
    const newImages = [...images];
    if (url) {
      // Update or add image
      if (index < newImages.length) {
        newImages[index] = url;
      } else {
        newImages.push(url);
      }
    } else {
      // Remove image
      newImages.splice(index, 1);
    }
    onImagesChange(newImages);
  };

  // Create slots for up to maxImages
  const slots = Array.from({ length: maxImages }, (_, i) => i);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Template Images <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Upload up to {maxImages} images showcasing your template. The first image will be used as the cover image.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((slotIndex) => {
          const imageUrl = images[slotIndex];
          const isFirst = slotIndex === 0;

          return (
            <ImageUpload
              key={slotIndex}
              imageUrl={imageUrl}
              onImageChange={(url) => handleImageChange(slotIndex, url)}
              disabled={disabled}
              maxSizeMB={5}
              uploadParams={{ noteId: uniqueId }}
              placeholder={isFirst ? "Upload cover image" : `Upload image ${slotIndex + 1}`}
              helperText="Max 5MB"
              badge={isFirst ? "Cover" : undefined}
              alt={`Template preview ${slotIndex + 1}`}
            />
          );
        })}
      </div>

      {images.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          At least one image is required. The first image will be used as the cover image.
        </p>
      )}
    </div>
  );
}

