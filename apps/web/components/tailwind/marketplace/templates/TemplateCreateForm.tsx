"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { GenericInput } from "@/components/tailwind/common/GenericInput";
import { GenericButton } from "@/components/tailwind/common/GenericButton";
import { GenericSelect } from "@/components/tailwind/common/GenericSelect";
import { TokenSelectField } from "@/components/tailwind/common/TokenSelectField";
import { CoverPlaceholderCard } from "@/components/tailwind/common/CoverPlaceholderCard";
import { useMarketplaceTemplates } from "@/contexts/marketplaceTemplatesContext";
import { useTemplateDraftForm } from "@/hooks/use-template-draft-form";
import type { TemplateDraftPayload } from "@/contexts/marketplaceTemplatesContext";
import { cn } from "@/lib/utils";
import type { MarketplaceTemplate } from "@/types/marketplace";
import { TemplateImageUpload } from "./TemplateImageUpload";

const CURRENCY_OPTIONS = [
  { label: "USD ($)", value: "USD" },
  { label: "EUR (€)", value: "EUR" },
  { label: "GBP (£)", value: "GBP" },
  { label: "INR (₹)", value: "INR" },
];

const TEMPLATE_CATEGORIES = [
  "Productivity",
  "Project Management",
  "Education",
  "Business",
  "Personal",
  "Finance",
  "Marketing",
  "Design",
  "Development",
  "Writing",
  "Planning",
  "Tracking",
  "Analytics",
  "CRM",
  "HR",
  "Sales",
  "Operations",
  "Research",
  "Content Creation",
  "Social Media",
];

const TEMPLATE_TAGS = [
  "Dashboard",
  "Calendar",
  "Task Management",
  "Note Taking",
  "Database",
  "Kanban",
  "Gantt Chart",
  "Budget",
  "Invoice",
  "CRM",
  "Lead Tracking",
  "Content Calendar",
  "Editorial Calendar",
  "Meeting Notes",
  "Project Tracker",
  "Time Tracking",
  "Expense Tracker",
  "Goal Setting",
  "Habit Tracker",
  "Recipe",
  "Travel Planning",
  "Event Planning",
  "Team Collaboration",
  "Client Management",
  "Inventory",
  "Sales Pipeline",
  "Marketing Campaign",
  "Content Planning",
  "Social Media",
  "Blog",
  "Newsletter",
  "Course",
  "Training",
  "Onboarding",
  "Employee Directory",
  "Performance Review",
  "OKR",
  "Roadmap",
  "Sprint Planning",
  "Bug Tracker",
];

interface TemplateCreateFormProps {
  onDraftSaved?: (template: MarketplaceTemplate) => void;
  onSubmitSuccess?: (template: MarketplaceTemplate) => void;
}

export function TemplateCreateForm({ onDraftSaved, onSubmitSuccess }: TemplateCreateFormProps = {}) {
  const [showErrors, setShowErrors] = useState(false);
  const {
    marketplaceTemplateId,
    editingDraft,
    isSavingDraft,
    isSubmittingTemplate,
    saveDraft,
    submitForReview,
    resetTemplateState,
    createDraft,
    setEditingDraft,
  } = useMarketplaceTemplates();
  const {
    formState,
    updateField,
    updateTitle,
    updateSlug,
    addToken,
    removeToken,
    resetForm,
    isPaidTemplate,
    requiresPrice,
    validationErrors,
    isValid,
    hasChanges,
    languageOptions,
    accessLockingOptions,
  } = useTemplateDraftForm(editingDraft);
  const isBusy = isSavingDraft || isSubmittingTemplate;

  const formattedPayload: TemplateDraftPayload = useMemo(
    () => ({
      title: formState.title.trim(),
      templateLink: formState.templateLink.trim(),
      description: formState.description.trim(),
      briefDescription: formState.briefDescription?.trim(),
      category: formState.category,
      tags: formState.tags,
      language: formState.language,
      urlSlug: formState.urlSlug.trim(),
      isPaid: isPaidTemplate,
      price: isPaidTemplate && formState.price !== undefined ? Number(formState.price) : undefined,
      currency: isPaidTemplate ? formState.currency : undefined,
      accessLocking: formState.accessLocking,
      // Set coverImage from first previewImage, or use existing coverImage
      coverImage: formState.previewImages && formState.previewImages.length > 0 
        ? formState.previewImages[0] 
        : formState.coverImage,
      previewImages: formState.previewImages || [],
    }),
    [formState, isPaidTemplate],
  );

  const handleSaveDraft = async () => {
    if (!isValid) {
      setShowErrors(true);
      return;
    }
    // Use saveDraft if editing existing draft, otherwise createDraft for new draft
    const saved = editingDraft
      ? await saveDraft(formattedPayload)
      : await createDraft(formattedPayload);
    if (saved && onDraftSaved) {
      onDraftSaved(saved);
    }
  };

  const handleSubmitForReview = async () => {
    if (!isValid) {
      setShowErrors(true);
      return;
    }
    // Pass hasChanges to submitForReview so it only saves if there are changes
    const submitted = await submitForReview(formattedPayload, hasChanges);
    if (submitted && onSubmitSuccess) {
      onSubmitSuccess(submitted);
    }
  };

  // Check if template is submitted and should be read-only
  const isSubmitted = editingDraft?.status === "submitted";
  const isApproved = editingDraft?.status === "approved";
  const isRejected = editingDraft?.status === "rejected";
  const isReadOnly = isSubmitted;

  const handleDiscard = () => {
    resetForm();
    resetTemplateState();
    setEditingDraft(null);
    setShowErrors(false);
  };

  return (
    <form className="flex flex-col gap-8 max-w-4xl">
      {/* Review Notes Banner for Rejected Templates */}
      {isRejected && editingDraft?.reviewNotes && (
        <div className="max-w-[960px] min-h-[60px] rounded-lg pt-2.5 px-6 pb-2.5 flex flex-col gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 mt-2.5">
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-semibold">
              <span className="text-xs font-semibold text-red-700 dark:text-red-300 whitespace-nowrap">
                Template Rejected
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-red-900 dark:text-red-200">Review Notes:</span>
            <span className="text-sm text-red-800 dark:text-red-300">{editingDraft.reviewNotes}</span>
          </div>
        </div>
      )}

      {/* Approved Banner */}
      {isApproved && (
        <div className="max-w-[960px] min-h-[60px] rounded-lg pt-2.5 px-6 pb-2.5 flex items-center flex-wrap gap-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 mt-2.5">
          <div className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
            <span className="text-xs font-semibold text-green-700 dark:text-green-300 whitespace-nowrap">
              Template Approved
            </span>
          </div>
          <span className="text-zinc-700 dark:text-zinc-300 text-sm">
            Your template has been approved. You can make changes and resubmit if needed.
          </span>
        </div>
      )}

      {/* Awaiting Approval Banner */}
      {isSubmitted && (
        <div className="max-w-[960px] min-h-[60px] rounded-lg pt-2.5 px-6 pb-2.5 flex items-center flex-wrap gap-2.5 bg-zinc-50 dark:bg-zinc-900/50 mt-2.5">
          <div className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">
              Awaiting Approval
            </span>
          </div>
          <span className="text-zinc-700 dark:text-zinc-300 text-sm">
            Templates under review are not editable. Review time is 1-3 business days.
          </span>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <input
          value={formState.title}
          onChange={(event) => !isReadOnly && updateTitle(event.target.value)}
          placeholder="Add template title"
          disabled={isReadOnly}
          className={cn(
            "w-full border-none bg-transparent text-4xl font-semibold text-zinc-700 placeholder:text-zinc-300 focus:outline-none dark:text-zinc-100",
            showErrors && validationErrors.title && "text-red-500 dark:text-red-400",
            isReadOnly && "opacity-60 cursor-not-allowed",
          )}
        />
        {showErrors && validationErrors.title && (
          <span className="text-xs text-red-500 dark:text-red-400">{validationErrors.title}</span>
        )}
      </section>

      <GenericInput
        label="Template link"
        type="url"
        placeholder="https://"
        value={formState.templateLink}
        onChange={(event) => !isReadOnly && updateField("templateLink", event.target.value)}
        error={showErrors ? validationErrors.templateLink : undefined}
        required
        disabled={isReadOnly}
      />

      <div className="flex flex-col gap-2">
      <TemplateImageUpload
        images={formState.previewImages || []}
        onImagesChange={(images) => {
          updateField("previewImages", images);
          // Automatically set first image as coverImage
          if (images.length > 0 && images[0]) {
            updateField("coverImage", images[0]);
          }
        }}
        disabled={isReadOnly}
        maxImages={5}
        templateId={marketplaceTemplateId || editingDraft?._id || null}
      />
        {showErrors && validationErrors.previewImages && (
          <span className="text-xs text-red-500 dark:text-red-400">{validationErrors.previewImages}</span>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <TokenSelectField
          label="Template categories"
          tokens={formState.category}
          options={TEMPLATE_CATEGORIES}
          placeholder="Select a category"
          helperText="Add up to five categories that describe your template."
          onAddToken={(token) => !isReadOnly && addToken("category", token)}
          onRemoveToken={(token) => !isReadOnly && removeToken("category", token)}
          disabled={isReadOnly}
          maxTokens={5}
        />
        <TokenSelectField
          label="Template tags"
          tokens={formState.tags}
          options={TEMPLATE_TAGS}
          placeholder="Select a tag"
          helperText="Add keywords to help people find your template."
          onAddToken={(token) => !isReadOnly && addToken("tags", token)}
          onRemoveToken={(token) => !isReadOnly && removeToken("tags", token)}
          disabled={isReadOnly}
          maxTokens={10}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <GenericSelect
          label="Language"
          value={formState.language}
          onChange={(event) => !isReadOnly && updateField("language", event.target.value)}
          options={languageOptions.map((option) => ({ label: option.label, value: option.value }))}
          disabled={isReadOnly}
        />
        <GenericSelect
          label="Access locking"
          value={formState.accessLocking || "open"}
          onChange={(event) =>
            !isReadOnly && updateField("accessLocking", event.target.value as TemplateDraftPayload["accessLocking"])
          }
          options={[
            { label: "Open - Anyone can duplicate", value: "open" },
            { label: "Locked - Prevent duplication across workspaces", value: "locked" },
            { label: "Restricted - Prevent re-selling purchased templates", value: "restricted" },
          ]}
          helperText="Control how people can duplicate or reuse your template."
          disabled={isReadOnly}
        />
      </div>

      <GenericInput
        label="Template URL slug"
        value={formState.urlSlug}
        onChange={(event) => !isReadOnly && updateSlug(event.target.value)}
        error={showErrors ? validationErrors.urlSlug : undefined}
        helperText="Appears at the end of the template URL."
        required
        disabled={isReadOnly}
      />

      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Paid template</label>
        <button
          type="button"
          aria-pressed={isPaidTemplate}
          onClick={() => !isReadOnly && updateField("isPaid", !isPaidTemplate)}
          disabled={isReadOnly}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            isPaidTemplate ? "bg-zinc-900" : "bg-zinc-300 dark:bg-zinc-700",
            isReadOnly && "opacity-60 cursor-not-allowed",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
              isPaidTemplate ? "translate-x-5" : "translate-x-1",
            )}
          />
        </button>
      </div>

      {isPaidTemplate && (
        <div className="grid gap-6 md:grid-cols-2">
          <GenericInput
            label="Price"
            type="number"
            min={1}
            step=".01"
            value={formState.price === undefined ? "" : String(formState.price)}
            onChange={(event) => {
              if (!isReadOnly) {
                const value = event.target.value;
                updateField("price", value === "" ? undefined : Number(value));
              }
            }}
            error={showErrors ? validationErrors.price : undefined}
            required={isPaidTemplate}
            disabled={isReadOnly}
          />
          <GenericSelect
            label="Currency"
            value={formState.currency || "USD"}
            onChange={(event) => !isReadOnly && updateField("currency", event.target.value)}
            options={CURRENCY_OPTIONS}
            disabled={isReadOnly}
          />
        </div>
      )}

      <GenericInput
        as="textarea"
        rows={3}
        label="Brief description"
        placeholder="Summarize your template in under 280 characters."
        value={formState.briefDescription}
        onChange={(event) => !isReadOnly && updateField("briefDescription", event.target.value)}
        characterCount={{
          current: formState.briefDescription?.length || 0,
          max: 280,
        }}
        error={showErrors ? validationErrors.briefDescription : undefined}
        required
        disabled={isReadOnly}
      />

      <GenericInput
        as="textarea"
        rows={6}
        label="Full description"
        placeholder="Describe what your template includes and how people can use it."
        value={formState.description}
        onChange={(event) => !isReadOnly && updateField("description", event.target.value)}
        error={showErrors ? validationErrors.description : undefined}
        required
        disabled={isReadOnly}
      />

      <div className="flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <GenericButton
            type="button"
            variant="ghost"
            label="Discard draft"
            onClick={handleDiscard}
            disabled={isBusy || isReadOnly}
          />
          <Link
            href="https://www.notion.com/help/selling-on-marketplace"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Get help
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <GenericButton
            type="button"
            variant="secondary"
            label={isSavingDraft ? "Saving..." : "Save draft"}
            onClick={handleSaveDraft}
            disabled={isBusy || !isValid || (!!editingDraft && !hasChanges) || isReadOnly}
            leadingIcon={isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
          />
          <GenericButton
            type="button"
            label={isSubmittingTemplate ? "Submitting..." : "Submit for review"}
            onClick={handleSubmitForReview}
            disabled={isBusy || !isValid || isReadOnly}
            leadingIcon={isSubmittingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
          />
        </div>
      </div>
    </form>
  );
}

