"use client";

import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConnectionCardProps {
  name: string;
  icon: React.ReactNode;
  description: string;
  badges?: string[];
  actionButtonText?: string;
  actionButtonVariant?: "connect" | "explore";
  onAction?: () => void;
  iconOverlay?: React.ReactNode; // For special cards with multiple icons
  showPlusIcon?: boolean; // Show plus icon next to main icon
  className?: string;
}

export function ConnectionCard({
  name,
  icon,
  description,
  badges = [],
  actionButtonText = "Connect",
  actionButtonVariant = "connect",
  onAction,
  iconOverlay,
  showPlusIcon = false,
  className,
}: ConnectionCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onAction}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAction?.();
        }
      }}
      className={cn(
        "user-select-none transition-all duration-200 ease-in cursor-pointer",
        "flex flex-col justify-between",
        "rounded-lg border border-zinc-200 dark:border-zinc-800",
        "p-3 h-full overflow-hidden",
        "min-w-[120px] gap-3 max-w-[256px]",
        "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
        className
      )}
    >
      <div>
        <div className="flex flex-col items-start gap-2">
          {/* Icon Section */}
          <div className="flex gap-1.5 items-center pt-2 pb-3">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
            {showPlusIcon && (
              <Plus className="w-3 h-3 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
            )}
            {iconOverlay && (
              <div className="flex items-center flex-row-reverse justify-end ml-1">
                {iconOverlay}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="flex items-center ml-0.5 mb-1 gap-1.5">
            <div className="font-medium text-sm leading-[1.3] text-zinc-900 dark:text-zinc-100">
              {name}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mx-0.5 font-normal text-zinc-600 dark:text-zinc-400 text-xs max-h-[72px] overflow-hidden leading-[1.3]">
          {description}
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mt-2 mb-1.5 text-xs text-zinc-500 dark:text-zinc-400 flex gap-1 font-medium">
            {badges.map((badge, index) => (
              <div
                key={index}
                aria-disabled="true"
                role="button"
                tabIndex={-1}
                className="user-select-none transition-colors duration-200 ease-in cursor-default flex items-center rounded"
              >
                <div className="px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 text-[9px] leading-none uppercase tracking-[0.04em] whitespace-nowrap">
                  {badge}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Button */}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onAction?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onAction?.();
          }
        }}
        className={cn(
          "user-select-none transition-colors duration-200 ease-in cursor-pointer",
          "opacity-100 inline-flex items-center h-7 px-2 rounded-md",
          "whitespace-nowrap text-sm justify-center font-medium",
          actionButtonVariant === "explore"
            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30"
            : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
          "hover:bg-blue-100 dark:hover:bg-blue-950/50"
        )}
      >
        {actionButtonText}
      </div>
    </div>
  );
}

export interface ConnectionCardGridProps {
  children: React.ReactNode;
  className?: string;
}

export function ConnectionCardGrid({ children, className }: ConnectionCardGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

