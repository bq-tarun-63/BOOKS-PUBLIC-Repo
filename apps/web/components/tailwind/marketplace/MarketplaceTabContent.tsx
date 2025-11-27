"use client";

import { useEffect } from "react";
import { useMarketplace } from "@/contexts/marketplaceContext";
import { ProfileContent } from "./tabs/ProfileContent";
import { TemplatesContent } from "./tabs/TemplatesContent";
import { ReviewerContent } from "./tabs/ReviewerContent";

export function MarketplaceTabContent() {
  const { activeTab } = useMarketplace();

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  // Use key prop to force React to remount component on tab change
  // This prevents state from previous tab from leaking
  switch (activeTab) {
    case "profile":
      return <ProfileContent key="profile" />;
    case "settings":
      return <div key="settings">Settings Content - Coming Soon</div>;
    case "analytics":
      return <div key="analytics">Analytics Content - Coming Soon</div>;
    case "coupons":
      return <div key="coupons">Coupons Content - Coming Soon</div>;
    case "learn":
      return <div key="learn">Learn Content - Coming Soon</div>;
    case "templates":
      return <TemplatesContent key="templates" />;
    case "services":
      return <div key="services">Services Content - Coming Soon</div>;
    case "integrations":
      return <div key="integrations">Integrations Content - Coming Soon</div>;
    case "reviewer":
      return <ReviewerContent key="reviewer" />;
    default:
      return <ProfileContent key="profile-default" />;
  }
}

