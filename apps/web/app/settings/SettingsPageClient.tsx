"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSettingsModal } from "@/contexts/settingsModalContext";

const VALID_TABS = new Set([
  "profile",
  "user_settings",
  "settings",
  "members",
  "teams",
  "integrations",
]);

interface SettingsPageClientProps {
  tab?: string;
  github?: string;
}

export default function SettingsPageClient({ tab, github }: SettingsPageClientProps) {
  const router = useRouter();
  const { openModal, setActiveTab } = useSettingsModal();

  useEffect(() => {
    openModal();
    if (tab && VALID_TABS.has(tab)) {
      setActiveTab(tab);
    }
  }, [openModal, setActiveTab, tab]);

  useEffect(() => {
    if (!github) return;
    if (github === "success") {
      toast.success("GitHub account connected");
    } else if (github === "error") {
      toast.error("Unable to connect GitHub account");
    }
  }, [github]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.search.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const hasRelevantParams = params.has("tab") || params.has("github");
    if (!hasRelevantParams) return;

    const timeout = window.setTimeout(() => {
      router.replace("/settings");
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex h-[80vh] w-full items-center justify-center px-6 text-sm text-zinc-500">
      <div className="text-center space-y-2">
        <p>Opening workspace settings…</p>
        <p>If nothing appears, try refreshing the page.</p>
      </div>
    </div>
  );
}


