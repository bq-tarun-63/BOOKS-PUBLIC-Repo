"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const VARIANT_STYLES: Record<string, string> = {
  primary:
    "border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900",
  secondary:
    "border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900",
  outline:
    "border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 bg-transparent",
  ghost:
    "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-0 bg-transparent",
};

const SIZE_STYLES: Record<string, string> = {
  sm: "h-7 px-2 text-sm",
  md: "h-8 px-3 text-sm",
  lg: "h-9 px-4 text-sm",
};

export interface GenericButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: keyof typeof VARIANT_STYLES;
  size?: keyof typeof SIZE_STYLES;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

export function GenericButton({
  label,
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  className,
  ...props
}: GenericButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-medium rounded-md transition-colors duration-200 ease-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:opacity-60 disabled:cursor-not-allowed",
        SIZE_STYLES[size],
        VARIANT_STYLES[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {leadingIcon && <span className="mr-2 flex items-center">{leadingIcon}</span>}
      <span>{label}</span>
      {trailingIcon && <span className="ml-2 flex items-center">{trailingIcon}</span>}
    </button>
  );
}

