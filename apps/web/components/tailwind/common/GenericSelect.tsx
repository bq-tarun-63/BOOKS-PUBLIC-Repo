"use client";

import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenericSelectOption {
  label: string;
  value: string;
}

interface GenericSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  helperText?: string;
  options: GenericSelectOption[];
}

export function GenericSelect({ label, helperText, options, className, disabled, ...props }: GenericSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <label>{label}</label>
        </div>
      )}
      <div className="relative">
        <select
          {...props}
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 disabled:opacity-60 disabled:cursor-not-allowed appearance-none pr-10",
            className,
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDown
            className={cn(
              "h-4 w-4 text-zinc-500 dark:text-zinc-400 transition-transform",
              disabled && "opacity-60",
            )}
          />
        </div>
      </div>
      {helperText && <span className="text-xs text-zinc-500 dark:text-zinc-400">{helperText}</span>}
    </div>
  );
}

