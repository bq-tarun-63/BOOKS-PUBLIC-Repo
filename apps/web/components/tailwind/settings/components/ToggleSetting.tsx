"use client";

import { cn } from "@/lib/utils";

interface ToggleSettingProps {
  label: string;
  description: string | React.ReactNode;
  checked: boolean;
  onChange?: (checked: boolean) => void;
}

export default function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between cursor-default">
      <div className="flex flex-col mr-[5%] w-3/4 gap-1.5">
        <div className="text-zinc-900 dark:text-zinc-100 text-sm leading-5 font-normal">
          <div className="flex flex-row gap-1">{label}</div>
        </div>
        <div className="text-zinc-600 dark:text-zinc-400 text-[13px] leading-[18px] font-normal">
          {description}
        </div>
      </div>
      <div className="relative flex-shrink-0 flex-grow-0 rounded-[44px] group">
        <div
          className={cn(
            "flex flex-shrink-0 h-3.5 w-[26px] rounded-[44px] p-0.5 box-content transition-all duration-200",
            checked
              ? "bg-blue-600 dark:bg-blue-500"
              : "bg-zinc-300 dark:bg-zinc-600"
          )}
        >
          <div
            className={cn(
              "w-3.5 h-3.5 rounded-[44px] bg-white transition-all duration-200 ease-out",
              checked ? "transform translate-x-3" : "transform translate-x-0"
            )}
          />
        </div>
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          className="absolute opacity-0 w-full h-full top-0 left-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

