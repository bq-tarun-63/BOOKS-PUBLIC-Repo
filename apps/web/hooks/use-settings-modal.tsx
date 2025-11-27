"use client";

import { useSettingsModal } from "@/contexts/settingsModalContext";
import type { SettingsModalContextType } from "@/contexts/settingsModalContext";

/**
 * Hook to access settings modal functionality
 * @returns Settings modal state and controls
 */
export function useSettingsModalHook(): SettingsModalContextType {
  return useSettingsModal();
}

