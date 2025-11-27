"use client";

import Link from "next/link";
import { useEffect } from "react";
import { MarketplaceLayout } from "@/components/tailwind/marketplace/MarketplaceLayout";
import { TemplateCreateForm } from "@/components/tailwind/marketplace/templates/TemplateCreateForm";
import { MarketplaceTemplatesProvider } from "@/contexts/marketplaceTemplatesContext";
import { useMarketplace } from "@/contexts/marketplaceContext";

export default function MarketplaceTemplateFormPage() {
  const { setActiveTab } = useMarketplace();

  useEffect(() => {
    setActiveTab("templates");
  }, [setActiveTab]);

  return (
    <MarketplaceLayout>
      <MarketplaceTemplatesProvider>
        <section className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <Link
                href="/profile?tab=templates"
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-100 mb-3"
              >
                ← Back to templates
              </Link>
              <div className="text-4xl font-semibold text-zinc-700 dark:text-zinc-100">Create template listing</div>
              <p className="text-base text-zinc-600 dark:text-zinc-400">
                Provide details about your template before submitting it for review.
              </p>
            </div>
          </div>
          <TemplateCreateForm />
        </section>
      </MarketplaceTemplatesProvider>
    </MarketplaceLayout>
  );
}

