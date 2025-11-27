"use client";

import { useEffect, useState } from "react";
import { useMarketplaceDiscovery } from "@/contexts/marketplaceDiscoveryContext";
import { useMarketplace } from "@/contexts/marketplaceContext";
import { useAuth } from "@/hooks/use-auth";
import { GenericButton } from "@/components/tailwind/common/GenericButton";
import { TemplateCard } from "@/components/tailwind/marketplace/TemplateCard";
import { Search, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/tailwind/ui/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { id: "trading-journal", label: "Trading Journal", icon: "📈" },
  { id: "annual-planning", label: "Annual Planning", icon: "📅" },
  { id: "study-planner", label: "Study Planner", icon: "🔖" },
  { id: "back-to-school", label: "Back to school", icon: "🏫" },
  { id: "operations", label: "Operations", icon: "🏗️" },
  { id: "enterprise", label: "Enterprise", icon: "📊" },
  { id: "planning-goals", label: "Planning & Goals", icon: "🎯" },
  { id: "personal-home", label: "Personal Home", icon: "🏠" },
  { id: "company-planning", label: "Company Planning", icon: "📈" },
  { id: "investing", label: "Investing", icon: "💰" },
];

const NAV_ITEMS = [
  { id: "discover", label: "Discover", href: "/marketplace" },
  { id: "work", label: "Work", href: "/marketplace/categories/work" },
  { id: "life", label: "Life", href: "/marketplace/categories/personal" },
  { id: "school", label: "School", href: "/marketplace/categories/school" },
];

export function MarketplaceDiscoveryContent() {
  const { templates, isLoading, fetchTemplates, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useMarketplaceDiscovery();
  const { profile, fetchProfile } = useMarketplace();
  const { user } = useAuth();
  const router = useRouter();
  const [localSearchQuery, setLocalSearchQuery] = useState("");

  // Fetch profile and templates on mount
  useEffect(() => {
    fetchProfile();
    fetchTemplates({ status: "approved" });
  }, [fetchProfile, fetchTemplates]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearchQuery);
    fetchTemplates({ search: localSearchQuery, category: selectedCategory || undefined, status: "approved" });
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    fetchTemplates({ search: searchQuery, category: categoryId || undefined, status: "approved" });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      {/* Main Content */}
      <div className="relative">
        <div className="relative">
          {/* Navigation */}
          <section className="flex justify-between items-center relative w-full gap-4">
            <nav className="flex gap-5">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "text-[30px] leading-9 font-semibold transition-colors",
                    item.id === "discover"
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {/* Search and Button */}
            <div className="flex items-center gap-3">
              <form onSubmit={handleSearch} className="relative">
                <div className="relative w-[296px] h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shadow-sm flex items-center px-2.5">
                  <Search className="w-5 h-5 text-zinc-400 dark:text-zinc-500 mr-2" />
                  <input
                    type="search"
                    placeholder="Try 'holiday planning'"
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                  />
                </div>
              </form>
              {user && (
                <GenericButton
                  label={profile ? "Create a template" : "Become a creator"}
                  variant="primary"
                  size="md"
                  onClick={() => router.push("/profile")}
                />
              )}
            </div>
          </section>

          {/* Category Pills */}
          <div className="mt-8">
            <div className="flex flex-wrap gap-1.5 pb-8">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(selectedCategory === category.id ? null : category.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-2 h-8 rounded-full border transition-colors",
                    selectedCategory === category.id
                      ? "bg-amber-100 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-zinc-900 dark:text-zinc-100"
                      : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                  )}
                >
                  <span className="text-base">{category.icon}</span>
                  <span className="text-sm font-normal">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="pb-16">
            {isLoading ? (
              <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))" }}>
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
                    <Skeleton className="w-full aspect-video" />
                    <div className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <Store className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No templates found</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {searchQuery || selectedCategory ? "Try adjusting your search or filters" : "Check back later for new templates"}
                </p>
              </div>
            ) : (
              <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))" }}>
                {templates.map((template) => (
                  <TemplateCard key={template._id} template={template} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

