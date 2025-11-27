"use client";

import { Wrench } from "lucide-react";
import { useSettingsModal } from "@/contexts/settingsModalContext";

export default function SettingsButton() {
  const { openModal } = useSettingsModal();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openModal}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
    >
      <Wrench className="w-3.5 h-3.5 fill-current" />
      Settings
    </div>
  );
}
