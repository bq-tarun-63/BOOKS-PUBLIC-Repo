"use client";

import React, { ReactNode } from "react";
import { useMarketplace } from "@/contexts/marketplaceContext";
import { SidebarTabList, type TabItem } from "./SidebarTabList";
import { useRouter, usePathname } from "next/navigation";
import {
  UserCircle2,
  Settings2,
  BarChart3,
  TicketPercent,
  BookOpen,
  FileText,
  BriefcaseBusiness,
  Plug,
  ShieldCheck,
} from "lucide-react";

const GENERAL_TABS: TabItem[] = [
  { id: "profile", label: "Profile", icon: UserCircle2, section: "General" },
  { id: "settings", label: "Settings", icon: Settings2, section: "General" },
  { id: "analytics", label: "Analytics", icon: BarChart3, section: "General" },
  { id: "coupons", label: "Coupons", icon: TicketPercent, section: "General" },
  { id: "learn", label: "Learn", icon: BookOpen, section: "General" },
];

const LISTINGS_TABS: TabItem[] = [
  { id: "templates", label: "Templates", icon: FileText, section: "Listings" },
  { id: "services", label: "Services", icon: BriefcaseBusiness, section: "Listings" },
  { id: "integrations", label: "Integrations", icon: Plug, section: "Listings" },
];

const REVIEWER_TAB: TabItem = { id: "reviewer", label: "Reviewer", icon: ShieldCheck, section: "Moderation" };

const ALL_TABS = [...GENERAL_TABS, ...LISTINGS_TABS];

interface MarketplaceLayoutProps {
  children: ReactNode;
}

export function MarketplaceLayout({ children }: MarketplaceLayoutProps) {
  const { activeTab, setActiveTab, isMarketplaceAdmin } = useMarketplace();
  const router = useRouter();
  const pathname = usePathname();

  // Handle tab change with URL update
  const handleTabChange = (tabId: string) => {
    // Update state immediately for instant feedback
    setActiveTab(tabId);
    // Update URL (this will trigger a re-render but state is already updated)
    router.push(`${pathname}?tab=${tabId}`, { scroll: false });
  };

  return (
    <section className="flex gap-10 min-h-screen">
      {/* Marketplace Sidebar */}
      <aside className="w-[260px]">
        <div className="fixed min-h-screen top-[60px] bottom-0 w-[240px] border border-zinc-200 bg-zinc-100 px-2 py-3 shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-800/80">
          <div className="h-full overflow-y-auto pr-1">
            <SidebarTabList
              tabs={isMarketplaceAdmin ? [...ALL_TABS, REVIEWER_TAB] : ALL_TABS}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              className="text-sm"
            />
          </div>
        </div>
      </aside>

      {/* Content Area */}
      <section className="w-[66vw] mx-auto pt-4">{children}</section>
    </section>
  );
}
