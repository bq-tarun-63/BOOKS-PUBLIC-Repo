"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCcw, ExternalLink, ShieldAlert, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useMarketplace } from "@/contexts/marketplaceContext";
import type { MarketplaceTemplate } from "@/types/marketplace";
import { getWithAuth, putWithAuth, type ApiErrorResponse } from "@/lib/api-helpers";
import { GenericButton } from "@/components/tailwind/common/GenericButton";
import { Skeleton } from "@/components/tailwind/ui/skeleton";

type TemplatesResponse = {
  templates?: MarketplaceTemplate[];
  message?: string;
};

const isApiErrorResponse = (response: unknown): response is ApiErrorResponse =>
  Boolean(response && typeof response === "object" && "isError" in response);

export function ReviewerContent() {
  const { isMarketplaceAdmin } = useMarketplace();
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actioningType, setActioningType] = useState<"approved" | "rejected" | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const fetchTemplates = useCallback(async () => {
    if (!isMarketplaceAdmin) return;
    setIsLoading(true);
    try {
      const response = await getWithAuth<TemplatesResponse>("/api/marketPlace/template/reviewer/getAllinReview");
      if (isApiErrorResponse(response)) {
        throw new Error(response.message || "Unable to fetch templates in review");
      }
      setTemplates(response.templates ?? []);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to fetch templates in review");
    } finally {
      setIsLoading(false);
    }
  }, [isMarketplaceAdmin]);

  const handleUpdateStatus = useCallback(
    async (templateId: string, status: "approved" | "rejected") => {
      if (!isMarketplaceAdmin) return;
      if (status === "rejected" && !(reviewNotes[templateId]?.trim().length)) {
        toast.error("Please provide review notes before rejecting a template.");
        return;
      }
      setActioningId(templateId);
      setActioningType(status);
      try {
        const response = await putWithAuth<{ template: MarketplaceTemplate }>(
          "/api/marketPlace/template/reviewer/updateStatus",
          {
            templateId,
            status,
            reviewNotes: status === "rejected" ? reviewNotes[templateId]?.trim() : undefined,
          },
        );
        if (isApiErrorResponse(response)) {
          throw new Error(response.message || "Failed to update template status");
        }
        setTemplates((prev) => prev.filter((template) => template._id !== templateId));
        setReviewNotes((prev) => {
          const updated = { ...prev };
          delete updated[templateId];
          return updated;
        });
        toast.success(`Template ${status === "approved" ? "approved" : "rejected"} successfully`);
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Unable to update template status");
      } finally {
        setActioningId(null);
        setActioningType(null);
      }
    },
    [isMarketplaceAdmin, reviewNotes],
  );

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

//   if (!isMarketplaceAdmin) {
//     return (
//       <div className="min-h-[400px] flex items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white/50 dark:border-zinc-700 dark:bg-zinc-900/30">
//         <div className="flex flex-col items-center gap-3 text-center text-zinc-600 dark:text-zinc-300">
//           <ShieldAlert className="h-10 w-10 text-amber-500" />
//           <div className="text-lg font-semibold">Reviewer access only</div>
//           <p className="text-sm max-w-md">
//             You need marketplace admin permissions to review submitted templates. Please contact an admin if you
//             believe this is a mistake.
//           </p>
//         </div>
//       </div>
//     );
//   }

  return (
    <div className="flex flex-col gap-6 min-h-[400px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-semibold text-zinc-900 dark:text-zinc-100">Reviewer panel</h2>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Review and approve templates submitted by creators before they are published.
          </p>
        </div>
        <GenericButton
          type="button"
          label={isLoading ? "Refreshing..." : "Refresh"}
          onClick={fetchTemplates}
          disabled={isLoading}
          variant="secondary"
          leadingIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-64" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex flex-wrap gap-3">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-32 rounded-full" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-6 w-20 rounded-md" />
                  <Skeleton className="h-6 w-18 rounded-md" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white/50 dark:border-zinc-700 dark:bg-zinc-900/20">
          <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            No templates are awaiting review right now. Come back later!
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {templates.map((template) => {
            const templateId = template._id;
            const submittedAt = template.submittedAt ? new Date(template.submittedAt).toLocaleString() : null;
            const noteValue = reviewNotes[templateId] ?? "";
            return (
              <article
                key={templateId}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{template.title}</div>
                      {template.templateLink && (
                        <a
                          href={template.templateLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View template
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {submittedAt && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">Submitted on {submittedAt}</div>
                    )}
                  </div>

                  {template.description && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-3">{template.description}</p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {template.language && (
                      <span className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                        Language: {template.language}
                      </span>
                    )}
                    {template.isPaid ? (
                      <span className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                        Paid template{template.price ? ` · ${template.currency || "USD"} ${template.price}` : ""}
                      </span>
                    ) : (
                      <span className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-700">Free</span>
                    )}
                    {template.category && template.category.length > 0 && (
                      <span className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                        Categories: {template.category.join(", ")}
                      </span>
                    )}
                  </div>

                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Review notes {template.status === "submitted" && "(required for rejection)"}
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      rows={3}
                      placeholder="Share context about this decision. Required when rejecting."
                      value={noteValue}
                      onChange={(event) =>
                        setReviewNotes((prev) => ({
                          ...prev,
                          [templateId]: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <GenericButton
                      type="button"
                      label={actioningId === templateId && actioningType === "approved" ? "Approving..." : "Approve"}
                      onClick={() => handleUpdateStatus(templateId, "approved")}
                      disabled={!!actioningId}
                      leadingIcon={
                        actioningId === templateId && actioningType === "approved" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 text-emerald-600" />
                        )
                      }
                    />
                    <GenericButton
                      type="button"
                      label={actioningId === templateId && actioningType === "rejected" ? "Rejecting..." : "Reject"}
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      onClick={() => handleUpdateStatus(templateId, "rejected")}
                      disabled={!!actioningId}
                      leadingIcon={
                        actioningId === templateId && actioningType === "rejected" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )
                      }
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}


