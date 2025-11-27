import { useRef, useState } from "react";
import { Paperclip, UploadCloud, Loader2, Download, X } from "lucide-react";
import { toast } from "sonner";
import { postWithAuth } from "@/lib/api-helpers";
import type { ApiErrorResponse } from "@/lib/api-helpers";

type FileAttachment = {
  id: string;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  uploadedAt?: string;
};

interface FilePropertyInputProps {
  value: FileAttachment[] | FileAttachment | undefined;
  onChange: (val: FileAttachment[], immediate?: boolean) => void;
}

const isApiErrorResponse = (response: unknown): response is ApiErrorResponse => {
  return Boolean(
    response &&
      typeof response === "object" &&
      "isError" in response &&
      (response as Record<string, unknown>).isError,
  );
};

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "application/pdf",
  "text/plain",
]);

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".pdf", ".txt"];

async function downloadAttachment(file: FileAttachment) {
  try {
    const response = await fetch(file.url);
    if (!response.ok) {
      throw new Error("Failed to download file");
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = file.name || "attachment";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error("Download failed", error);
    toast.error("Unable to download file. Please try again.");
  }
}

export const FilePropertyInput = ({ value, onChange }: FilePropertyInputProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const files: FileAttachment[] = Array.isArray(value)
    ? value
    : value
      ? [value]
      : [];

  const handleUploadClick = (event: React.MouseEvent<HTMLButtonElement>) => {
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

      const descriptor: FileAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        url: uploadResponse.url,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      };

      onChange([...files, descriptor], true);
      toast.success(`${file.name} uploaded`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (fileId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const next = files.filter((file) => file.id !== fileId);
    onChange(next, true);
  };

  return (
    <div className="w-[260px] rounded-sm px-2 py-2 hover:bg-gray-200 dark:hover:bg-[#2c2c2c]">
      <div className="flex flex-col gap-2">
        {files.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 m-0">No files attached</p>
        ) : (
          <ul className="flex flex-col gap-1 m-0 p-0">
            {files.map((file) => (
              <li
                key={file.id}
                className="group flex items-center m-0 gap-2 rounded-md bg-white/60 px-2 py-1 text-sm text-gray-900 shadow-sm dark:bg-white/5 dark:text-gray-50"
              >
                <Paperclip className="h-4 w-4 text-gray-500" />
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={file.name}
                  className="flex-1 truncate text-sm text-blue-600 hover:underline dark:text-blue-400"
                  onClick={(event) => event.stopPropagation()}
                >
                  {file.name}
                </a>
                <button
                  type="button"
                  className="rounded p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10"
                  onClick={(event) => {
                    event.stopPropagation();
                    void downloadAttachment(file);
                  }}
                  aria-label={`Download ${file.name}`}
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10"
                  onClick={(event) => handleRemove(file.id, event)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-white/10"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {isUploading ? "Uploading…" : "Upload file"}
          </button>
          {files.length > 0 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onChange([], true);
              }}
              className="text-sm text-gray-500 underline-offset-2 hover:underline dark:text-gray-300"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

