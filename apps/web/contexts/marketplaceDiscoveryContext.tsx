"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { getWithAuth } from "@/lib/api-helpers";
import type { MarketplaceTemplate } from "@/types/marketplace";
import { toast } from "sonner";

type TemplatesApiResponse =
  | { templates?: MarketplaceTemplate[]; total?: number; page?: number; limit?: number }
  | { isError: true; message?: string };

interface MarketplaceDiscoveryContextValue {
  templates: MarketplaceTemplate[];
  isLoading: boolean;
  fetchTemplates: (params?: { search?: string; category?: string; status?: string }) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}

const MarketplaceDiscoveryContext = createContext<MarketplaceDiscoveryContextValue | undefined>(
  undefined,
);

type ApiResponse<T> = T | { isError: true; message?: string };

function isApiError(response: unknown): response is { isError: true; message?: string } {
  return typeof response === "object" && response !== null && "isError" in response;
}

export function MarketplaceDiscoveryProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchTemplates = useCallback(
    async (params?: { search?: string; category?: string; status?: string }) => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append("status", params?.status || "approved");
        if (params?.search) {
          queryParams.append("search", params.search);
        }
        if (params?.category) {
          queryParams.append("category", params.category);
        }

        const response = await getWithAuth<TemplatesApiResponse>(
          `/api/marketPlace/template/discover?${queryParams.toString()}`,
        );

        if (isApiError(response)) {
          throw new Error(response.message || "Failed to fetch templates");
        }

        const templatesData = response as { templates?: MarketplaceTemplate[] };
        const fetchedTemplates = Array.isArray(templatesData.templates) ? templatesData.templates : [];
        setTemplates(fetchedTemplates);
      } catch (error) {
        console.error(error);
        toast.error("Unable to load marketplace templates");
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return (
    <MarketplaceDiscoveryContext.Provider
      value={{
        templates,
        isLoading,
        fetchTemplates,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
      }}
    >
      {children}
    </MarketplaceDiscoveryContext.Provider>
  );
}

export function useMarketplaceDiscovery() {
  const context = useContext(MarketplaceDiscoveryContext);
  if (context === undefined) {
    throw new Error("useMarketplaceDiscovery must be used within a MarketplaceDiscoveryProvider");
  }
  return context;
}

