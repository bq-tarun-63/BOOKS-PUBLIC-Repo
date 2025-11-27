"use client";

import { MarketplaceDiscoveryProvider } from "@/contexts/marketplaceDiscoveryContext";
import { MarketplaceDiscoveryContent } from "@/components/tailwind/marketplace/discovery/MarketplaceDiscoveryContent";

export default function MarketplacePage() {
  return (
    <MarketplaceDiscoveryProvider>
      <MarketplaceDiscoveryContent />
    </MarketplaceDiscoveryProvider>
  );
}

