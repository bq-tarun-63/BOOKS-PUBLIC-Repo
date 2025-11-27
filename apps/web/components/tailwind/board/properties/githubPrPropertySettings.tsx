"use client";

import { useEffect, useMemo, useState } from "react";
import { GitPullRequest } from "lucide-react";
import type { BoardPropertyOption, GitHubPrConfig } from "@/types/board";

interface StatusProperty {
  id: string;
  name: string;
  options?: BoardPropertyOption[];
}

interface GitHubPrPropertySettingsProps {
  config: GitHubPrConfig;
  statusProperties: StatusProperty[];
  onUpdate: (partial: Partial<GitHubPrConfig>) => Promise<void> | void;
}

export function GitHubPrPropertySettings({
  config,
  statusProperties,
  onUpdate,
}: GitHubPrPropertySettingsProps) {
  const [owner, setOwner] = useState(config.defaultOwner ?? "");
  const [repo, setRepo] = useState(config.defaultRepo ?? "");
  const [installationId, setInstallationId] = useState(
    config.installationId ? String(config.installationId) : "",
  );

  useEffect(() => {
    setOwner(config.defaultOwner ?? "");
  }, [config.defaultOwner]);

  useEffect(() => {
    setRepo(config.defaultRepo ?? "");
  }, [config.defaultRepo]);

  useEffect(() => {
    setInstallationId(config.installationId ? String(config.installationId) : "");
  }, [config.installationId]);

  const selectedStatusProperty = useMemo(
    () => statusProperties.find((prop) => prop.id === config.statusPropertyId),
    [config.statusPropertyId, statusProperties],
  );

  return (
    <div className="px-2 py-2 border-t border-border/60 mt-2 space-y-3">
      <div className="space-y-1 px-3">
          <label className="text-xs font-medium text-muted-foreground">Sync to Property</label>
          <select
            value={config.statusPropertyId ?? ""}
            onChange={(e) =>
              void onUpdate({
                statusPropertyId: e.target.value || undefined,
                pendingStatusOptionId: undefined,
                completedStatusOptionId: undefined,
              })
            }
            className="w-full px-2 py-1.5 text-sm rounded-md border border-border bg-transparent focus-visible:outline-none"
          >
            <option value="">Choose property</option>
            {statusProperties.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.name.slice(0, 1).toUpperCase() + prop.name.slice(1)}
              </option>
            ))}
          </select>
      </div>

      {config.statusPropertyId &&(
        <div className="space-y-1 px-3">
          <label className="text-xs font-medium text-muted-foreground">Status Mapping</label>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Pending</span>
              <select
                value={config.pendingStatusOptionId ?? ""}
                onChange={(e) =>
                  void onUpdate({
                    pendingStatusOptionId: e.target.value || undefined,
                  })
                }
                className="flex-1 px-2 py-1.5 text-sm rounded-md border border-border bg-transparent focus-visible:outline-none"
              >
                <option value="">Choose option</option>
                {selectedStatusProperty?.options?.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Completed</span>
              <select
                value={config.completedStatusOptionId ?? ""}
                onChange={(e) =>
                  void onUpdate({
                    completedStatusOptionId: e.target.value || undefined,
                  })
                }
                className="flex-1 px-2 py-1.5 text-sm rounded-md border border-border bg-transparent focus-visible:outline-none "
              >
                <option value="">Choose option</option>
                {selectedStatusProperty?.options?.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between py-1 px-3">
          <p className="text-sm m-0 font-medium text-foreground">Auto-sync status</p>
          <button
            type="button"
            onClick={() => void onUpdate({ autoSync: !(config.autoSync ?? true) })}
            className={`w-10 h-5 rounded-full transition-colors ${
              config.autoSync ?? true ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`block w-4 h-4 bg-background rounded-full transition-transform translate-y-0.5 ${
                config.autoSync ?? true ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
      </div>
    </div>
  );
}

