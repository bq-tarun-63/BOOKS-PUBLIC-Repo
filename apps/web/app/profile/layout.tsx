"use client";

import { ReactNode } from "react";
import { MarketplaceHeader } from "@/components/tailwind/marketplace/MarketplaceHeader";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      <MarketplaceHeader />
      {children}
    </div>
  );
}
