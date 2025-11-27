"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import slugify from "slugify";
import type { TemplateDraftPayload } from "@/contexts/marketplaceTemplatesContext";
import type { MarketplaceTemplate } from "@/types/marketplace";

const DEFAULT_LANGUAGE = "en-US";

const LANGUAGE_OPTIONS = [
  { label: "English (US)", value: "en-US" },
  { label: "English (UK)", value: "en-GB" },
  { label: "Spanish", value: "es-ES" },
  { label: "French", value: "fr-FR" },
  { label: "German", value: "de-DE" },
  { label: "Portuguese (Brazil)", value: "pt-BR" },
  { label: "Hindi", value: "hi-IN" },
] as const;

type AccessLockingOption = NonNullable<TemplateDraftPayload["accessLocking"]>;

const ACCESS_LOCKING_OPTIONS: AccessLockingOption[] = ["open", "locked", "restricted"];

export type TemplateDraftFormState = TemplateDraftPayload & {
  tags: string[];
  category: string[];
  coverImage?: string;
  previewImages?: string[];
};

const initialState: TemplateDraftFormState = {
  title: "",
  templateLink: "",
  description: "",
  briefDescription: "",
  category: [],
  tags: [],
  language: DEFAULT_LANGUAGE,
  urlSlug: "",
  isPaid: false,
  price: undefined,
  currency: "USD",
  // templateId:"",
  accessLocking: "open",
  coverImage: undefined,
  previewImages: [],
};

export function useTemplateDraftForm(initialDraft?: MarketplaceTemplate | null) {
  // Convert MarketplaceTemplate to form state
  const getInitialState = useCallback((): TemplateDraftFormState => {
    if (!initialDraft) return initialState;
    
    return {
      title: initialDraft.title || "",
      templateLink: initialDraft.templateLink || "",
      description: initialDraft.description || "",
      briefDescription: initialDraft.briefDescription || "",
      category: initialDraft.category || [],
      tags: initialDraft.tags || [],
      language: initialDraft.language || DEFAULT_LANGUAGE,
      urlSlug: initialDraft.urlSlug || "",
      isPaid: initialDraft.isPaid ?? false,
      price: initialDraft.price,
      currency: initialDraft.currency || "USD",
      accessLocking: initialDraft.accessLocking || "open",
      coverImage: initialDraft.coverImage,
      previewImages: initialDraft.previewImages || [],
    };
  }, [initialDraft]);

  const [formState, setFormState] = useState<TemplateDraftFormState>(getInitialState);
  const [slugTouched, setSlugTouched] = useState(false);
  const [originalState, setOriginalState] = useState<TemplateDraftFormState>(getInitialState);

  // Update form when initialDraft changes
  useEffect(() => {
    const newState = getInitialState();
    setFormState(newState);
    setOriginalState(newState);
    setSlugTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDraft]);

  const updateField = useCallback(<K extends keyof TemplateDraftFormState>(key: K, value: TemplateDraftFormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateTitle = useCallback(
    (value: string) => {
      setFormState((prev) => {
        const nextState = { ...prev, title: value };
        if (!slugTouched) {
          nextState.urlSlug = slugify(value, { lower: true, strict: true });
        }
        return nextState;
      });
    },
    [slugTouched],
  );

  const updateSlug = useCallback((value: string) => {
    setSlugTouched(true);
    setFormState((prev) => ({ ...prev, urlSlug: slugify(value, { lower: true, strict: true }) }));
  }, []);

  const addToken = useCallback((key: "category" | "tags", token: string) => {
    if (!token.trim()) return;
    setFormState((prev) => {
      if (prev[key].includes(token.trim())) return prev;
      return {
        ...prev,
        [key]: [...prev[key], token.trim()],
      };
    });
  }, []);

  const removeToken = useCallback((key: "category" | "tags", token: string) => {
    setFormState((prev) => ({
      ...prev,
      [key]: prev[key].filter((item) => item !== token),
    }));
  }, []);

  const resetForm = useCallback(() => {
    const resetState = getInitialState();
    setFormState(resetState);
    setOriginalState(resetState);
    setSlugTouched(false);
  }, [getInitialState]);

  const isPaidTemplate = formState.isPaid ?? false;
  const requiresPrice = isPaidTemplate;

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!formState.title.trim()) errors.title = "Template name is required.";
    if (!formState.templateLink.trim()) {
      errors.templateLink = "Template link is required.";
    } else {
      try {
        new URL(formState.templateLink);
      } catch {
        errors.templateLink = "Enter a valid URL.";
      }
    }

    if (!formState.urlSlug.trim()) errors.urlSlug = "Template slug is required.";
    if (!formState.description.trim()) errors.description = "Full description is required.";
    if (!formState.briefDescription?.trim()) errors.briefDescription = "Brief description is required.";
    if (formState.briefDescription && formState.briefDescription.length > 280) {
      errors.briefDescription = "Brief description must be under 280 characters.";
    }
    if (!formState.previewImages || formState.previewImages.length === 0) {
      errors.previewImages = "At least one template image is required.";
    }
    if (requiresPrice) {
      if (formState.price === undefined || Number.isNaN(formState.price)) {
        errors.price = "Enter a price.";
      } else if (formState.price <= 0) {
        errors.price = "Price must be greater than zero.";
      }
    }
    return errors;
  }, [formState, requiresPrice]);

  const isValid = Object.keys(validationErrors).length === 0;

  // Check if form has been modified from original
  const hasChanges = useMemo(() => {
    return JSON.stringify(formState) !== JSON.stringify(originalState);
  }, [formState, originalState]);

  return {
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
    languageOptions: LANGUAGE_OPTIONS,
    accessLockingOptions: ACCESS_LOCKING_OPTIONS,
  };
}

