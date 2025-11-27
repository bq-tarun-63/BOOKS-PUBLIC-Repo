"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { postWithAuth, getWithAuth } from "@/lib/api-helpers";
import type { MarketplaceTemplate } from "@/types/marketplace";
import { toast } from "sonner";

interface TemplateDraftPayload {
  // templateId: string;
  title: string;
  templateLink: string;
  description: string;
  briefDescription?: string;
  category?: string[];
  tags?: string[];
  language?: string;
  urlSlug: string;
  isPaid?: boolean;
  price?: number;
  currency?: string;
  accessLocking?: "open" | "locked" | "restricted";
  coverImage?: string;
  previewImages?: string[];
}

type TemplatesApiResponse =
  | { templates?: MarketplaceTemplate[] }
  | { isError: true; message?: string };

interface MarketplaceTemplatesContextValue {
  marketplaceTemplateId: string | null;
  lastSavedTemplate: MarketplaceTemplate | null;
  editingDraft: MarketplaceTemplate | null;
  isSavingDraft: boolean;
  isSubmittingTemplate: boolean;
  // Drafts management
  drafts: MarketplaceTemplate[];
  isDraftsLoading: boolean;
  fetchDrafts: () => Promise<void>;
  addOrUpdateDraft: (template: MarketplaceTemplate) => void;
  setEditingDraft: (draft: MarketplaceTemplate | null) => void;
  saveDraft: (payload: TemplateDraftPayload) => Promise<MarketplaceTemplate | null>;
  submitForReview: (payload?: TemplateDraftPayload, hasChanges?: boolean) => Promise<MarketplaceTemplate | null>;
  resetTemplateState: () => void;
  createDraft: (payload: TemplateDraftPayload) => Promise<MarketplaceTemplate | null>;
}

const MarketplaceTemplatesContext = createContext<MarketplaceTemplatesContextValue | undefined>(
  undefined,
);

type ApiResponse<T> = T | { isError: true; message?: string };

function isApiError(response: unknown): response is { isError: true; message?: string } {
  return typeof response === "object" && response !== null && "isError" in response;
}

export function MarketplaceTemplatesProvider({ children }: { children: ReactNode }) {
  const [marketplaceTemplateId, setMarketplaceTemplateId] = useState<string | null>(null);
  const [lastSavedTemplate, setLastSavedTemplate] = useState<MarketplaceTemplate | null>(null);
  const [editingDraft, setEditingDraft] = useState<MarketplaceTemplate | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false);
  const [drafts, setDrafts] = useState<MarketplaceTemplate[]>([]);
  const [isDraftsLoading, setIsDraftsLoading] = useState(false);

  const resetTemplateState = useCallback(() => {
    setMarketplaceTemplateId(null);
    setLastSavedTemplate(null);
    setEditingDraft(null);
  }, []);

  const fetchDrafts = useCallback(async () => {
    setIsDraftsLoading(true);
    try {
      const response = await getWithAuth<TemplatesApiResponse>("/api/marketPlace/template/getAll", {});
      if ("isError" in response && response.isError) {
        throw new Error(response.message || "Failed to fetch drafts");
      }
      const templatesData = response as { templates?: MarketplaceTemplate[] };
      const templates = Array.isArray(templatesData.templates) ? templatesData.templates : [];
      setDrafts(templates);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load draft templates");
    } finally {
      setIsDraftsLoading(false);
    }
  }, []);

  const addOrUpdateDraft = useCallback((template: MarketplaceTemplate) => {
    setDrafts((prevDrafts) => {
      // Check if draft already exists (update case)
      const existingIndex = prevDrafts.findIndex((draft) => draft._id === template._id);
      if (existingIndex >= 0) {
        // Update existing draft
        const updated = [...prevDrafts];
        updated[existingIndex] = template;
        return updated;
      }
      // Add new draft at the beginning
      return [template, ...prevDrafts];
    });
  }, []);

  const handleSetEditingDraft = useCallback((draft: MarketplaceTemplate | null) => {
    setEditingDraft(draft);
    if (draft?._id) {
      setMarketplaceTemplateId(String(draft._id));
    } else {
      setMarketplaceTemplateId(null);
    }
  }, []);

  const createDraft = useCallback(
    async (payload: TemplateDraftPayload) => {
        setIsSavingDraft(true);
      try {
        const response = (await postWithAuth("/api/marketPlace/template/draft/create", {
          ...payload,
        })) as ApiResponse<{ template: MarketplaceTemplate }>;
        if (isApiError(response)) {
          toast.error(response.message || "Failed to create draft");
          return null;
        }
        const draftTemplate = response.template;
        if (!draftTemplate?._id) {
          toast.error("Missing template identifier in response");
          return null;
        }
        setMarketplaceTemplateId(String(draftTemplate._id));
        setLastSavedTemplate(draftTemplate);
        toast.success("Draft created");
        return draftTemplate;
      }
      finally {
        setIsSavingDraft(false);
      }
    },
    [],
  );

  const saveDraft = useCallback(
    async (payload: TemplateDraftPayload) => {
      if (!payload.title || !payload.templateLink || !payload.urlSlug) {
        toast.error("You have not filled all the required fields or filed wrong information in wrong format.");
        return null;
      }
      setIsSavingDraft(true);
      try {
        let response: ApiResponse<{ template: MarketplaceTemplate }>;
        
        if (!editingDraft?._id) {
          toast.error("unable to find the template to update");
          return null;
        }
          // Update existing draft
          response = (await postWithAuth("/api/marketPlace/template/draft/update", {
            templateId: editingDraft._id,
            ...payload,
          })) as ApiResponse<{ template: MarketplaceTemplate }>;
         

        if (isApiError(response)) {
          toast.error(response.message || "Failed to save draft");
          return null;
        }

        const draftTemplate = response.template;
        if (!draftTemplate?._id) {
          toast.error("Missing template identifier in response");
          return null;
        }

        setMarketplaceTemplateId(String(draftTemplate._id));
        setLastSavedTemplate(draftTemplate);
        setEditingDraft(null); // Clear editing draft after save
        toast.success("Draft saved");
        return draftTemplate;
      } catch (error) {
        console.error("Failed to save template draft", error);
        toast.error("Failed to save template draft. Please try again.");
        return null;
      } finally {
        setIsSavingDraft(false);
      }
    },
    [editingDraft],
  );

  const submitForReview = useCallback(
    async (payload?: TemplateDraftPayload, hasChanges?: boolean) => {
      setIsSubmittingTemplate(true);
      try {
        let ensuredMarketplaceTemplateId = marketplaceTemplateId || editingDraft?._id || null;

        // Only save if there are changes or if it's a new draft
        if (payload) {
          // If editing existing draft and has changes, save first
          if (editingDraft?._id && hasChanges) {
            const template = await saveDraft(payload);
            ensuredMarketplaceTemplateId = template?._id ?? ensuredMarketplaceTemplateId;
          } 
          // If new draft (no editingDraft and no marketplaceTemplateId), create it first
          else if (!editingDraft?._id && !marketplaceTemplateId) {
            const template = await createDraft(payload);
            ensuredMarketplaceTemplateId = template?._id ?? ensuredMarketplaceTemplateId;
          }
          // If editing existing draft but no changes, use existing ID
          else if (editingDraft?._id && !hasChanges) {
            ensuredMarketplaceTemplateId = editingDraft._id;
          }
          // If marketplaceTemplateId exists but no editingDraft, use existing ID (already saved)
          else if (marketplaceTemplateId && !editingDraft?._id) {
            ensuredMarketplaceTemplateId = marketplaceTemplateId;
          }
        }

        if (!ensuredMarketplaceTemplateId) {
          toast.error("Save the template draft before submitting for review.");
          return null;
        }

        const response = (await postWithAuth("/api/marketPlace/template/submitForReview", {
          templateId: ensuredMarketplaceTemplateId,
        })) as ApiResponse<{ template: MarketplaceTemplate }>;

        if (isApiError(response)) {
          toast.error(response.message || "Failed to submit for review");
          return null;
        }

        setLastSavedTemplate(response.template);
        setEditingDraft(null); // Clear editing draft after submission
        toast.success("Template submitted for review");
        return response.template;
      } catch (error) {
        console.error("Failed to submit template for review", error);
        toast.error("Failed to submit template for review. Please try again.");
        return null;
      } finally {
        setIsSubmittingTemplate(false);
      }
    },
    [marketplaceTemplateId, saveDraft, createDraft, editingDraft],
  );

  const value = useMemo(
    () => ({
      marketplaceTemplateId,
      lastSavedTemplate,
      editingDraft,
      isSavingDraft,
      isSubmittingTemplate,
      drafts,
      isDraftsLoading,
      fetchDrafts,
      addOrUpdateDraft,
      setEditingDraft: handleSetEditingDraft,
      saveDraft,
      submitForReview,
      resetTemplateState,
      createDraft,
    }),
    [
      marketplaceTemplateId,
      lastSavedTemplate,
      editingDraft,
      isSavingDraft,
      isSubmittingTemplate,
      drafts,
      isDraftsLoading,
      fetchDrafts,
      addOrUpdateDraft,
      saveDraft,
      createDraft,
      submitForReview,
      resetTemplateState,
    ],
  );

  return (
    <MarketplaceTemplatesContext.Provider value={value}>
      {children}
    </MarketplaceTemplatesContext.Provider>
  );
}

export function useMarketplaceTemplates() {
  const context = useContext(MarketplaceTemplatesContext);
  if (!context) {
    throw new Error("useMarketplaceTemplates must be used within MarketplaceTemplatesProvider");
  }
  return context;
}

export type { TemplateDraftPayload };

