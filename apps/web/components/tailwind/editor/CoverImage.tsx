"use client";

import React, { useState, useEffect } from "react";

interface CoverImageProps {
  coverUrl: string | null;
  onCoverChange: (url: string) => void;
  onCoverRemove: () => void;
  onUploadCover?: (file: File) => Promise<string>;
  workspaceId?: string;
  openPicker?: boolean;
  onPickerClose?: () => void;
}

interface CoverImage {
  url: string;
  name: string;
  position: string;
}

interface CoverCategory {
  name: string;
  link: string;
  images: CoverImage[];
}

const coverImages = [
  {
    name: "webb9",
    url: "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb9.jpg-16700a4d-2002-4bb5-9a58-093f846f4891",
  },
  {
    name: "webb10",
    url: "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb10.jpg-b2ed6e01-04fa-4aa5-9348-2e174bced6d1",
  },
  {
    name: "webb11",
    url: "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb11.jpg-74b82ff6-4c24-4624-b9b5-271018338cc5",
  },
  {
    name: "webb8",
    url: "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb8.jpg-fc5e1f03-2e45-4ec4-b42c-ceea68e0914a",
  },
  {
    name: "webb7",
    url: "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb7.jpg-1a8679f3-4615-4238-be82-ca7eeabb564a",
  },
  {
    name: "webb5",
    url: "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb5.jpg-6e6e3edd-b5bc-4358-9057-882615687ec9",
  },
  {
    name: "webb4",
    url: "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb4.jpg-f4956ea4-3be4-4038-ab37-13c443b1f747",
  },
  {
    name: "webb3",
    url: "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb3.jpg-c5fa84c9-eb10-45c0-ada0-d942c375505e",
  },
  {
    name: "webb2",
    url: "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb2.jpg-a5d3c718-d396-4c0e-9261-fc686a9f83a7",
  },
  {
    name: "webb1",
    url: "https://raw.githubusercontent.com/bq-praveen-33/novel-data/main/docs/notes/68ff105b39ec3d06c5436af1/images/webb1.jpg-511f13da-cd30-4431-acfd-840b180d9b72",
  },
];

export default function CoverImage({ coverUrl, onCoverChange, onCoverRemove, onUploadCover, workspaceId, openPicker, onPickerClose }: CoverImageProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"gallery" | "upload" | "link">("gallery");
  const [coverCategories, setCoverCategories] = useState<CoverCategory[]>([]);
  const [uploadedCovers, setUploadedCovers] = useState<CoverImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Handle external picker control
  useEffect(() => {
    if (openPicker !== undefined) {
      setShowPicker(openPicker);
    }
  }, [openPicker]);

  // Load cover images dynamically from API
  useEffect(() => {
    const loadCovers = async () => {
      try {
        // Always show local covers immediately
        const wsId = workspaceId || 'default';
        const uploadData = coverImages;
        if (uploadData && uploadData.length > 0) {
          setUploadedCovers(
            uploadData.map((cover: any) => ({
              url: cover.url,
              name: cover.name,
              position: 'center 50%'
            }))
          );
        }

        // Load gallery covers (best effort; do not block local list)
        // try {
        //   const response = await fetch('/api/covers');
        //   if (!response.ok) throw new Error('Failed to fetch covers');
        //   const data = await response.json();

        //   if (data.images && data.images.length > 0) {
        //     const categories: CoverCategory[] = [];

        //     const webbImages = data.images.filter((img: CoverImage) =>
        //       img.name.toLowerCase().startsWith('webb')
        //     );

        //     if (webbImages.length > 0) {
        //       categories.push({
        //         name: "James Webb Telescope",
        //         link: "https://webbtelescope.org/",
        //         images: webbImages.map((img: CoverImage, idx: number) => ({
        //           ...img,
        //           position:
        //             idx % 4 === 0 ? 'center 0%' :
        //             idx % 4 === 1 ? 'center 30%' :
        //             idx % 4 === 2 ? 'center 50%' : 'center 60%'
        //         }))
        //       });
        //     }

        //     const otherImages = data.images.filter((img: CoverImage) =>
        //       !img.name.toLowerCase().startsWith('webb')
        //     );

        //     if (otherImages.length > 0) {
        //       categories.push({
        //         name: "Other Covers",
        //         link: "#",
        //         images: otherImages
        //       });
        //     }

        //     setCoverCategories(categories);
        //   }
        // } catch (err) {
        //   // Silently ignore; local covers are already shown
        // }
      } catch (error) {
        console.error('Failed to load cover images:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (showPicker) {
      loadCovers();
    }
  }, [showPicker, workspaceId]);

  const handlePickerClose = () => {
    setShowPicker(false);
    if (onPickerClose) {
      onPickerClose();
    }
  };

  return (
    <>
      {/* Only show cover image if coverUrl exists */}
      {coverUrl && (
        <div className="relative w-full h-[30vh] max-h-[280px] flex-shrink-0">
          <div
            className="w-full h-full cursor-pointer"
            onDoubleClick={() => setShowPicker(true)}
          >
            <img
              src={coverUrl}
              alt="Page cover"
              className="w-full h-full object-cover"
              style={{ objectPosition: "center 50%" }}
            />
          </div>
        </div>
      )}

      {/* Cover Picker Modal */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/20 dark:bg-black/40"
          onClick={handlePickerClose}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl overflow-hidden w-[540px] max-w-[calc(100vw-24px)] flex flex-col"
            style={{ maxHeight: "485px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tabs Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 px-2 overflow-x-auto">
              <div className="flex gap-1 py-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("gallery")}
                  className={`relative px-2 h-7 rounded-md text-sm transition-colors whitespace-nowrap ${
                    activeTab === "gallery"
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  Gallery
                  {activeTab === "gallery" && (
                    <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gray-900 dark:bg-white" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className={`px-2 h-7 rounded-md text-sm transition-colors whitespace-nowrap ${
                    activeTab === "upload"
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("link")}
                  className={`px-2 h-7 rounded-md text-sm transition-colors whitespace-nowrap ${
                    activeTab === "link"
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  Link
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  onCoverRemove();
                  handlePickerClose();
                }}
                className="px-2 h-7 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Remove
              </button>
            </div>

            {/* Gallery Tab Content */}
            {activeTab === "gallery" && (
              <div className="flex-1 overflow-y-auto pb-2">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Loading covers...
                    </div>
                  </div>
                ) : coverCategories.length === 0 && uploadedCovers.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        No cover images found
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Add images to <code className="bg-gray-100 dark:bg-zinc-800 px-1 rounded">public/images/page-cover/</code>
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Uploaded Covers Section */}
                    {uploadedCovers.length > 0 && (
                      <div className="py-1 px-1">
                        {/* Category Header */}
                        <div className="flex items-center justify-between px-2 mt-1.5 mb-2">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Uploaded Covers
                          </span>
                        </div>

                        {/* Image Grid */}
                        <div className="flex flex-wrap px-3">
                          {uploadedCovers.map((image, idx) => (
                            <div key={`uploaded-${idx}`} className="w-1/4 p-[3px]">
                              <button
                                type="button"
                                onClick={() => {
                                onCoverChange(image.url);
                                handlePickerClose();
                                }}
                                className={`w-full h-16 rounded overflow-hidden transition-all ${
                                  coverUrl === image.url
                                    ? "ring-2 ring-blue-500"
                                    : "hover:opacity-80"
                                }`}
                              >
                                <img
                                  src={image.url}
                                  alt={image.name}
                                  className="w-full h-full object-cover"
                                  style={{ objectPosition: image.position }}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gallery Covers */}
                    {coverCategories.map((category) => (
                      <div key={category.name} className="py-1 px-1">
                        {/* Category Header */}
                        <div className="flex items-center justify-between px-2 mt-1.5 mb-2">
                          <a
                            href={category.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                          >
                            {category.name}
                          </a>
                        </div>

                        {/* Image Grid */}
                        <div className="flex flex-wrap px-3">
                          {category.images.map((image, idx) => (
                            <div key={image.url} className="w-1/4 p-[3px]">
                              <button
                                type="button"
                                onClick={() => {
                                onCoverChange(image.url);
                                handlePickerClose();
                                }}
                                className={`w-full h-16 rounded overflow-hidden transition-all ${
                                  coverUrl === image.url
                                    ? "ring-2 ring-blue-500"
                                    : "hover:opacity-80"
                                }`}
                              >
                                <img
                                  src={image.url}
                                  alt={image.name}
                                  className="w-full h-full object-cover"
                                  style={{ objectPosition: image.position }}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Upload Tab Content */}
            {activeTab === "upload" && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Upload a cover image
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="cover-upload"
                    disabled={isUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIsUploading(true);
                        try {
                          if (onUploadCover) {
                            const uploadedUrl = await onUploadCover(file);
                            onCoverChange(uploadedUrl);

                            // Reload covers to show the newly uploaded one
                            // const wsId = workspaceId || 'default';
                            // const uploadResponse = await fetch(`/api/note/upload-cover?workspaceId=${wsId}`);
                            // const uploadData = await uploadResponse.json();

                            // if (uploadData.covers && uploadData.covers.length > 0) {
                            //   setUploadedCovers(uploadData.covers.map((cover: any) => ({
                            //     url: cover.url,
                            //     name: cover.name,
                            //     position: 'center 50%'
                            //   })));
                            // }

                            // Switch to gallery tab to show the uploaded cover
                            // setActiveTab("gallery");
                          } else {
                            // Fallback to base64
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                onCoverChange(event.target.result as string);
                                handlePickerClose();
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        } catch (error) {
                          console.error("Upload failed:", error);
                        } finally {
                          setIsUploading(false);
                          handlePickerClose();
                          // Clear input to allow re-selecting the same file if needed
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                  <label
                    htmlFor="cover-upload"
                    className={`inline-block px-4 py-2 rounded-md transition-colors cursor-pointer text-white ${
                      isUploading
                        ? "bg-blue-400 cursor-not-allowed opacity-70"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                    aria-disabled={isUploading}
                  >
                    {isUploading ? "Uploading..." : "Choose File"}
                  </label>
                </div>
              </div>
            )}

            {/* Link Tab Content */}
            {activeTab === "link" && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Paste an image link
                  </p>
                  <input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const input = e.target as HTMLInputElement;
                        if (input.value) {
                          onCoverChange(input.value);
                          handlePickerClose();
                        }
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Press Enter to apply
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

