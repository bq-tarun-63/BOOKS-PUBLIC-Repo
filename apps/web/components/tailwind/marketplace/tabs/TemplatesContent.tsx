"use client";

import { useEffect, useState } from "react";
import { useMarketplace } from "@/contexts/marketplaceContext";
import { GenericButton } from "@/components/tailwind/common/GenericButton";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TemplateCreateForm } from "../templates/TemplateCreateForm";
import { MarketplaceTemplatesProvider, useMarketplaceTemplates } from "@/contexts/marketplaceTemplatesContext";
import { MarketplaceTemplate } from "@/types/marketplace";
import { Skeleton } from "@/components/tailwind/ui/skeleton";

function TemplatesContentInner() {
  const { profile, isLoading, setActiveTab } = useMarketplace();
  const { drafts, isDraftsLoading, fetchDrafts, addOrUpdateDraft, setEditingDraft, editingDraft } = useMarketplaceTemplates();
  const [templateTab, setTemplateTab] = useState<"listings" | "reviews">("listings");
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchDrafts();
    }
  }, [profile, fetchDrafts]);

  const handleCreateProfile = () => {
    setActiveTab("profile");
  };

  const handleEditDraft = (draft: MarketplaceTemplate) => {
    setEditingDraft(draft);
    setIsCreatingTemplate(true);
  };

  const handleCreateNew = () => {
    setEditingDraft(null);
    setIsCreatingTemplate(true);
  };

  const handleBackToDrafts = () => {
    setEditingDraft(null);
    setIsCreatingTemplate(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-6 w-96" />
          </div>
          <Skeleton className="h-12 w-64" />
        </div>
      </div>
    );
  }

  // Show create profile prompt if profile doesn't exist
  if (!profile) {
    return (
      <div className="min-h-[400px]">
        <section className="flex flex-col gap-2 mb-7">
          <div className="text-4xl leading-10 font-semibold m-0 text-zinc-700 dark:text-zinc-100">
            Templates
          </div>
          <div className="text-base leading-[26px] font-medium text-zinc-600 dark:text-zinc-400">
            Update template information, pin templates, and more.
          </div>
        </section>
        <div className="inline-block min-w-6 min-h-6" />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <div className="text-2xl text-zinc-600 dark:text-zinc-100 font-semibold">
              Create a Marketplace Profile
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              A Marketplace Profile is required to submit and manage Books templates.{" "}
              <span className="cursor-pointer text-zinc-900 dark:text-zinc-100 font-semibold hover:underline">
                <a>Read FAQ</a>
              </span>
            </div>
          </div>
          <div>
            <GenericButton
              label="Create a Profile"
              onClick={handleCreateProfile}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isCreatingTemplate) {
    return (
      <div className="min-h-[400px] flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-semibold text-zinc-900 dark:text-zinc-100">
              {editingDraft ? "Edit template listing" : "Create template listing"}
            </h2>
            <p className="text-base text-zinc-600 dark:text-zinc-400">
              {editingDraft
                ? "Update your template information and save as draft or submit for review."
                : "Add metadata for your existing template and save it as a draft or submit for review."}
            </p>
          </div>
          <GenericButton variant="ghost" label="Back to drafts" onClick={handleBackToDrafts} />
        </div>
        <TemplateCreateForm
          onDraftSaved={(template) => {
            // Add or update the draft in the list using context function
            addOrUpdateDraft(template);
            handleBackToDrafts();
          }}
          onSubmitSuccess={(template) => {
            // Update the draft status in the list when submitted
            addOrUpdateDraft(template);
            handleBackToDrafts();
          }}
        />
      </div>
    );
  }

  // Show templates content when profile exists
  return (
    <div className="min-h-[400px]">
      <section className="flex flex-col gap-2 mb-7">
        <div className="text-4xl leading-10 font-semibold m-0 text-zinc-900 dark:text-zinc-100">
          Templates
        </div>
        <div className="text-base leading-[26px] font-medium text-zinc-600 dark:text-zinc-400">
          Update template information, pin templates, and more.
        </div>
      </section>
      <div className="inline-block min-w-6 min-h-6" />

      {/* Tab List */}
      <div
        className="overflow-auto visible flex w-full relative text-sm pr-2 z-[1] mt-5 mb-12 border-b border-zinc-200 dark:border-zinc-700"
        role="tablist"
      >
        {/* Template listings tab - active */}
        <div className="py-1.5 whitespace-nowrap min-w-0 flex-shrink-0 text-zinc-900 dark:text-zinc-100 relative">
          <div
            role="tab"
            tabIndex={0}
            aria-selected={templateTab === "listings"}
            onClick={() => setTemplateTab("listings")}
            className={cn(
              "user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center h-7 px-2 rounded-md whitespace-nowrap text-sm flex-shrink-0 leading-[1.2] min-w-0",
              templateTab === "listings"
                ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                : "text-zinc-600 dark:text-zinc-400"
            )}
          >
            Template listings
          </div>
          {templateTab === "listings" && (
            <div className="border-b-2 border-zinc-900 dark:border-zinc-100 absolute bottom-0 left-2 right-2" />
          )}
        </div>

        {/* Ratings & reviews tab */}
        <div className="py-1.5 whitespace-nowrap min-w-0 flex-shrink-0 text-zinc-600 dark:text-zinc-400">
          <div
            role="tab"
            tabIndex={0}
            aria-selected={templateTab === "reviews"}
            onClick={() => setTemplateTab("reviews")}
            className={cn(
              "user-select-none transition-colors duration-200 ease-in cursor-pointer inline-flex items-center h-7 px-2 rounded-md whitespace-nowrap text-sm flex-shrink-0 leading-[1.2] min-w-0",
              templateTab === "reviews"
                ? "text-zinc-900 dark:text-zinc-100 font-semibold bg-zinc-100 dark:bg-zinc-800/50"
                : "text-zinc-600 dark:text-zinc-400"
            )}
          >
            Ratings & reviews
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {templateTab === "listings" && (
        <section className="flex flex-col gap-[72px]">
          <section>
            <section className="flex flex-col gap-2 mb-7">
              <div className="text-2xl leading-[30px] font-semibold m-0 text-zinc-900 dark:text-zinc-100">
                Drafts
              </div>
              <div className="text-[15px] leading-[22px] m-0 text-zinc-600 dark:text-zinc-400">
                Start a template and submit for approval.{" "}
                <span className="cursor-pointer text-zinc-900 dark:text-zinc-100 font-semibold hover:underline">
                  <a>Read FAQ</a>
                </span>
              </div>
            </section>
            <div className="flex flex-col gap-7">
              <button
                type="button"
                onClick={handleCreateNew}
                className="flex text-zinc-900 dark:text-zinc-100 no-underline user-select-none transition-colors duration-200 ease-in cursor-pointer w-full items-center gap-6 rounded-lg px-6 py-4 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <div className="relative rounded-md aspect-[16/10] shadow-sm border border-zinc-200 dark:border-zinc-700 flex-shrink-0">
                  <div className="w-40 h-[100px] object-cover rounded-md">
                    <div className="bg-zinc-100 dark:bg-zinc-800 h-full w-full flex justify-center items-center rounded-md">
                      <Plus className="w-8 h-8 text-zinc-600 dark:text-zinc-400 flex-shrink-0" />
                    </div>
                  </div>
                </div>
                <div className="flex self-center justify-between flex-grow">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-600 dark:text-zinc-400 text-sm">Start a New Template</span>
                  </div>
                </div>
              </button>
              <div className="flex flex-col gap-4">
                <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Your draft templates</div>
                {isDraftsLoading ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <div className="flex gap-4">
                          <Skeleton className="w-24 h-16 rounded-md flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <Skeleton className="h-5 w-48 mb-2" />
                                <Skeleton className="h-3 w-32" />
                              </div>
                              <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
                            </div>
                            <div className="mt-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4 mt-1" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : drafts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    Draft templates will appear here after you save them.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {drafts.map((draft) => {
                      // Get cover image - use first preview image or coverImage
                      const coverImage = draft.previewImages && draft.previewImages.length > 0 
                        ? draft.previewImages[0] 
                        : draft.coverImage;

                      return (
                        <div
                          key={draft._id}
                          className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                          onClick={() => handleEditDraft(draft)}
                        >
                          <div className="flex gap-4">
                            {/* Cover Image Thumbnail */}
                            <div className="flex-shrink-0">
                              {coverImage ? (
                                <div className="relative w-30 h-20 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                  <img
                                    src={coverImage}
                                    alt={draft.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-24 h-16 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                  <div className="text-zinc-400 dark:text-zinc-600 text-xs text-center px-1">No image</div>
                                </div>
                              )}
                            </div>
                            
                            {/* Card Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between pr-5">
                                <div className="flex-1 min-w-0">
                                  <div className="text-base font-medium text-zinc-900 dark:text-zinc-100 truncate">{draft.title}</div>
                                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Last updated{" "}
                                    {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString() : "Just now"}
                                  </div>
                                </div>
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border flex-shrink-0",
                                    draft.status === "submitted"
                                      ? "bg-zinc-50 border-zinc-300 text-zinc-700 dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-zinc-300"
                                      : draft.status === "approved"
                                        ? "bg-zinc-50 border-zinc-300 text-zinc-700 dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-zinc-300"
                                        : draft.status === "rejected"
                                          ? "bg-zinc-50 border-zinc-300 text-zinc-700 dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-zinc-300"
                                          : "bg-zinc-100 border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400",
                                  )}
                                >
                                  {draft.status === "submitted" ? (
                                    <>
                                      <span className="text-xs">✓</span>
                                      <span>Submitted</span>
                                    </>
                                  ) : draft.status === "approved" ? (
                                    <>
                                      <span className="text-xs">✓</span>
                                      <span>Approved</span>
                                    </>
                                  ) : draft.status === "rejected" ? (
                                    <>
                                      <span className="text-xs">×</span>
                                      <span>Rejected</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-xs">○</span>
                                      <span>Draft</span>
                                    </>
                                  )}
                                </span>
                              </div>
                              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                {draft.briefDescription || "No description provided."}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </section>
      )}

      {templateTab === "reviews" && (
        <div className="text-zinc-600 dark:text-zinc-400">
          Ratings & reviews content - Coming Soon
        </div>
      )}
    </div>
  );
}

export function TemplatesContent() {
  return (
    <MarketplaceTemplatesProvider>
      <TemplatesContentInner />
    </MarketplaceTemplatesProvider>
  );
}

