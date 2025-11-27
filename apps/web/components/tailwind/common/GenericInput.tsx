"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BaseInputProps = {
  label?: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
};

type InputProps = BaseInputProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
    as?: "input";
    characterCount?: never;
    maxLength?: number;
  };

type TextareaProps = BaseInputProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
    as: "textarea";
    characterCount?: {
      current: number;
      max: number;
    };
  };

export type GenericInputProps = InputProps | TextareaProps;

const INPUT_BASE_STYLES =
  "px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

const INPUT_DISABLED_STYLES =
  "px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 text-sm text-zinc-500 dark:text-zinc-400 cursor-not-allowed";

export function GenericInput({
  label,
  required = false,
  helperText,
  error,
  disabled = false,
  fullWidth = true,
  className,
  id,
  as = "input",
  characterCount,
  ...props
}: GenericInputProps) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  const hasError = !!error;
  const showCharacterCount = as === "textarea" && characterCount;

  const inputStyles = disabled
    ? INPUT_DISABLED_STYLES
    : hasError
      ? INPUT_BASE_STYLES.replace("border-zinc-200 dark:border-zinc-700", "border-red-300 dark:border-red-600")
      : INPUT_BASE_STYLES;

  const inputElement =
    as === "textarea" ? (
      <textarea
        id={inputId}
        disabled={disabled}
        className={cn(inputStyles, fullWidth && "w-full", className)}
        {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    ) : (
      <input
        id={inputId}
        type={(props as InputProps).type || "text"}
        disabled={disabled}
        className={cn(inputStyles, fullWidth && "w-full", className)}
        {...(props as InputHTMLAttributes<HTMLInputElement>)}
      />
    );

  return (
    <div className={cn("flex flex-col gap-2", fullWidth && "w-full")}>
      {label && (
        <div className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <label htmlFor={inputId}>{label}</label>
          {required && <span className="text-red-500">*</span>}
        </div>
      )}
      {inputElement}
      {(helperText || error || showCharacterCount) && (
        <div className="flex items-center justify-between">
          <div className="text-xs">
            {error ? (
              <span className="text-red-600 dark:text-red-400">{error}</span>
            ) : helperText ? (
              <span className="text-zinc-500 dark:text-zinc-400">{helperText}</span>
            ) : null}
          </div>
          {showCharacterCount && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              <span>{characterCount.current}</span> / {characterCount.max} characters
            </div>
          )}
        </div>
      )}
    </div>
  );
}

