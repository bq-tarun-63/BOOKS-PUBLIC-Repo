"use client";

import { MarketplaceLayout } from "@/components/tailwind/marketplace/MarketplaceLayout";
import { MarketplaceTabContent } from "@/components/tailwind/marketplace/MarketplaceTabContent";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useMarketplace } from "@/contexts/marketplaceContext";

const BASE_TABS = [
  "profile",
  "settings",
  "analytics",
  "coupons",
  "learn",
  "templates",
  "services",
  "integrations",
];

export default function MarketplaceProfilePage() {
  const searchParams = useSearchParams();
  const { activeTab, setActiveTab, isMarketplaceAdmin } = useMarketplace();
  const tabParam = searchParams?.get("tab");
  const lastSyncedTab = useRef<string | null>(null);
  const allowedTabs = useMemo(() => {
    const tabs = new Set(BASE_TABS);
    if (isMarketplaceAdmin) {
      tabs.add("reviewer");
    }
    return tabs;
  }, [isMarketplaceAdmin]);

  // Sync URL param with context - URL is the source of truth
  useEffect(() => {
    const safeTab = tabParam && allowedTabs.has(tabParam) ? tabParam : "profile";
    
    // Only update if URL changed and we haven't synced this tab yet
    if (lastSyncedTab.current !== safeTab) {
      lastSyncedTab.current = safeTab;
      if (activeTab !== safeTab) {
        setActiveTab(safeTab);
      }
    }
  }, [tabParam, allowedTabs, activeTab, setActiveTab]);

  return (
    <MarketplaceLayout>
      <MarketplaceTabContent />
    </MarketplaceLayout>
  );
}
