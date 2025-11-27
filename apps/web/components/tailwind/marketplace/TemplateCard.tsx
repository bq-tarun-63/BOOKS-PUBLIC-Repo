"use client";

import { type MarketplaceTemplate } from "@/types/marketplace";
import Link from "next/link";
import Image from "next/image";
import { Store } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TemplateCardProps {
  template: MarketplaceTemplate & {
    creatorProfile?: {
      displayName: string;
      profilePicture?: string;
    };
  };
  onClick?: () => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const coverImage = template.previewImages?.[0] || template.coverImage;
  const creatorName = template.creatorProfile?.displayName || "Unknown Creator";
  const creatorImage = template.creatorProfile?.profilePicture;
  const isPaid = Boolean(template.isPaid);

  const handleCardClick = () => {
    onClick?.();
  };

  const content = (
    <div
      className="group relative flex w-full cursor-pointer flex-col rounded-xl bg-transparent transition-[background] duration-200"
      onClick={handleCardClick}
    >
      {/* Cover Image */}
      <div className="relative w-full overflow-hidden rounded-xl">
        {coverImage ? (
          <img
            src={coverImage}
            alt={template.title}
            loading="lazy"
            className="block h-auto w-full aspect-[16/10] object-cover rounded-xl"
          />
        ) : (
          <div className="flex aspect-[16/10] w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            <Store className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
          </div>
        )}

        {/* Overlay shadow similar to Notion card */}
        <div className="pointer-events-none absolute inset-0 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.02),0_0_0_1px_rgba(0,0,0,0.05)]" />

        {/* Price badge at top-right corner */}
        <div className="absolute right-3 top-3 z-10">
          <div
            className={cn(
              "flex h-fit w-fit items-center rounded-md px-1.5 py-0.5 text-sm font-medium leading-5 backdrop-blur-[32px]",
              "bg-white/80 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400"
            )}
          >
            {isPaid
              ? `${template.currency || "USD"} ${template.price}`
              : "Free"}
          </div>
        </div>
      </div>

      {/* Single row: avatar • title */}
      <div className="relative pt-3 px-4 pb-4">
        <div className="flex items-center gap-2">
          {/* Profile Avatar */}
          <div className="rounded-full bg-white dark:bg-zinc-900 outline outline-1 outline-offset-[-1px] outline-zinc-200 dark:outline-zinc-700">
            <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full">
              {creatorImage ? (
                <Image
                  src={creatorImage}
                  alt={creatorName}
                  width={22}
                  height={22}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="h-full w-full rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700" />
              )}
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-1 items-center min-w-0">
            <p className="truncate text-sm font-medium leading-5 text-zinc-900 dark:text-zinc-50">
              {template.title}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // If onClick handler is provided, return a div; otherwise return a Link
  if (onClick) {
    return content;
  }

  return (
    <Link href={`/marketplace/templates/${template.urlSlug || template._id}`}>
      {content}
    </Link>
  );
}


