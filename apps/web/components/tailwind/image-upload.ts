import { postWithAuth } from "@/lib/api-helpers";
import { createImageUpload } from "novel";
import { toast } from "sonner";

const onUpload = async (file: File) => {
  const filePath = `docs/image/${file?.name || "image.png"}`;
  const arrayBuffer = await file.arrayBuffer();

  const promise = postWithAuth("/api/note/upload", arrayBuffer, {
    headers: {
      "content-type": file?.type || "application/octet-stream",
      "x-vercel-filename": encodeURIComponent(filePath),
    },
    body: arrayBuffer,
  });

  return new Promise((resolve, reject) => {
    toast.promise(
      promise.then(async (res) => {
        // Successfully uploaded image
        if (res.status === 200 || res.status === 201) {
          const { url } = res as { url: string };
          // preload the image
          const image = new Image();
          image.onload = () => {
            resolve(url);
          };
          image.onerror = (e) => {
            console.error("Failed to load image", e);
            // resolve(url); // Optionally remove this to catch broken image load
            reject(new Error("Uploaded, but image failed to load. Possible CORS or format issue."));
          };
          image.src = url;
          // No blob store configured
        } else if (res.status === 401) {
          resolve(file);
          throw new Error("`BLOB_READ_WRITE_TOKEN` environment variable not found, reading image locally instead.");
          // Unknown error
        } else {
          throw new Error("Error uploading image. Please try again.");
        }
      }),
      {
        loading: "Uploading image...",
        success: "Image uploaded successfully.",
        error: (e) => {
          reject(e);
          return e.message;
        },
      },
    );
  });
};

export const uploadFn = createImageUpload({
  onUpload,
  validateFn: (file) => {
    if (!file.type.includes("image/")) {
      toast.error("File type not supported.");
      return false;
    }
    if (file.size / 1024 / 1024 > 20) {
      toast.error("File size too big (max 20MB).");
      return false;
    }
    return true;
  },
});

// Returns the uploaded file URL on success
export async function uploadCoverImage(
  file: File,
  params?: { noteId?: string; parentId?: string },
): Promise<string> {
  // Reuse validation rules
  if (!file.type.includes("image/")) {
    toast.error("File type not supported.");
    throw new Error("Unsupported file type");
  }
  if (file.size / 1024 / 1024 > 20) {
    toast.error("File size too big (max 20MB).");
    throw new Error("File too large");
  }

  const fileName = file?.name || "cover.png";
  const filePath = params?.noteId
    ? `docs/covers/${params.noteId}/${fileName}`
    : `docs/image/${fileName}`;
  const arrayBuffer = await file.arrayBuffer();

  const promise = postWithAuth("/api/note/upload", arrayBuffer, {
    headers: {
      "content-type": file?.type || "application/octet-stream",
      "x-vercel-filename": encodeURIComponent(filePath),
    },
    body: arrayBuffer,
  }).then(async (res) => {
    if (res.status === 200 || res.status === 201) {
      const { url } = res as { url: string };
      return url;
    }
    if (res.status === 401) {
      // fall back to local read if blob store is not configured
      return URL.createObjectURL(new Blob([arrayBuffer], { type: file.type }));
    }
    throw new Error("Error uploading image. Please try again.");
  });

  return new Promise<string>((resolve, reject) => {
    toast.promise(
      promise.then((url) => {
        const image = new Image();
        image.onload = () => resolve(url);
        image.onerror = (e) => {
          console.error("Failed to load image", e);
          reject(new Error("Uploaded, but image failed to load. Possible CORS or format issue."));
        };
        image.src = url;
      }),
      {
        loading: "Uploading image...",
        success: "Image uploaded successfully.",
        error: (e) => {
          reject(e);
          return (e as Error).message;
        },
      },
    );
  });
}
