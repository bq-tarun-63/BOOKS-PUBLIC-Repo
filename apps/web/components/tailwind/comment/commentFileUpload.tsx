"use client";

import { useRef, useState, useMemo } from "react";
import { Paperclip, Loader2, X, Download } from "lucide-react";
import { toast } from "sonner";
import { postWithAuth } from "@/lib/api-helpers";
import type { ApiErrorResponse } from "@/lib/api-helpers";

export type MediaMetaData = {
  id: string;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  uploadedAt?: string;
};

interface CommentFileUploadHookProps {
  mediaMetaData: MediaMetaData[];
  onMediaChange: (media: MediaMetaData[]) => void;
  noteId?: string;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "application/pdf",
  "text/plain",
]);

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".pdf", ".txt"];

const isApiErrorResponse = (response: unknown): response is ApiErrorResponse => {
  return Boolean(
    response &&
      typeof response === "object" &&
      "isError" in response &&
      (response as Record<string, unknown>).isError,
  );
};

export const useCommentFileUpload = ({
  mediaMetaData,
  onMediaChange,
  noteId,
}: CommentFileUploadHookProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();
    const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    const hasAllowedMime = file.type ? ALLOWED_MIME_TYPES.has(file.type) : false;

    if (!hasAllowedExtension && !hasAllowedMime) {
      toast.error("Only PNG, JPG, PDF, or TXT files are allowed.");
      event.target.value = "";
      return;
    }

    await uploadFile(file);
    event.target.value = "";
  };

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      const arrayBuffer = await file.arrayBuffer();
      const referer = typeof window !== "undefined" ? window.location.href : "";
      const noteIdFromUrl = noteId || referer.split("/").pop() || "";

      const uploadResponse = await postWithAuth<{ url: string }>(
        "/api/note/upload",
        arrayBuffer,
        {
          headers: {
            "content-type": file.type || "application/octet-stream",
            "x-vercel-filename": encodeURIComponent(`docs/files/${file.name}`),
          },
        },
      );

      if (!uploadResponse || isApiErrorResponse(uploadResponse)) {
        throw new Error(uploadResponse?.message || "Failed to upload file");
      }

      const descriptor: MediaMetaData = {
        id: crypto.randomUUID(),
        name: file.name,
        url: uploadResponse.url,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      };

      onMediaChange([...mediaMetaData, descriptor]);
      toast.success(`${file.name} uploaded`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (fileId: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    const next = mediaMetaData.filter((file) => file.id !== fileId);
    onMediaChange(next);
  };

  const handleDownload = async (file: MediaMetaData, event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download file:", error);
      toast.error("Failed to download file");
    }
  };

  const attachmentsElement = useMemo(() => {
    if (mediaMetaData.length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {mediaMetaData.map((file) => (
          <div
            key={file.id}
            className="group flex items-center gap-1 rounded-md bg-white/60 px-2 py-1 text-xs text-gray-900 shadow-sm dark:bg-white/5 dark:text-gray-50"
          >
            <Paperclip className="h-3 w-3 text-gray-500" />
            <span className="max-w-[120px] truncate">{file.name}</span>
            <button
              type="button"
              className="rounded p-0.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10"
              onClick={(e) => handleDownload(file, e)}
              aria-label={`Download ${file.name}`}
            >
              <Download className="h-3 w-3" />
            </button>
            <button
              type="button"
              className="rounded p-0.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10"
              onClick={(e) => handleRemove(file.id, e)}
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    );
  }, [mediaMetaData]);

  return {
    isUploading,
    openFilePicker: handleUploadClick,
    handleFileChange,
    fileInputRef,
    attachmentsElement,
  };
};

