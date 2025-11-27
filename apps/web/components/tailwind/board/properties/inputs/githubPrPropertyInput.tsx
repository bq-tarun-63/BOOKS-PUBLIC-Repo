"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { GitPullRequest, ExternalLink, RefreshCw, Search } from "lucide-react";
import type { BoardProperty } from "@/types/board";
import {
  normalizeGitHubPrValue,
  getGitHubPrStatusMeta,
  parseGitHubPrUrl,
  type GitHubPrValue,
} from "@/utils/githubPr";

interface GitHubPrPropertyInputProps {
  value: any;
  onChange: (val: any, immediate?: boolean) => void;
  property?: BoardProperty;
}

interface PullRequest {
  number: number;
  title: string;
  state: "open" | "closed";
  merged: boolean;
  draft: boolean;
  htmlUrl: string;
}

const DEFAULT_VALUE: GitHubPrValue = {};

export function GitHubPrPropertyInput({ value, onChange, property }: GitHubPrPropertyInputProps) {
  const normalized = useMemo(() => normalizeGitHubPrValue(value), [value]);
  const [formValue, setFormValue] = useState<GitHubPrValue>(() => ({
    ...DEFAULT_VALUE,
    ...normalized,
    owner: normalized.owner ?? property?.githubPrConfig?.defaultOwner,
    repo: normalized.repo ?? property?.githubPrConfig?.defaultRepo,
  }));
  const [inputValue, setInputValue] = useState("");
  const [showPrList, setShowPrList] = useState(false);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFormValue({
      ...DEFAULT_VALUE,
      ...normalized,
      owner: normalized.owner ?? property?.githubPrConfig?.defaultOwner,
      repo: normalized.repo ?? property?.githubPrConfig?.defaultRepo,
    });
  }, [normalized, property?.githubPrConfig?.defaultOwner, property?.githubPrConfig?.defaultRepo]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPrList(false);
      }
    };
    if (showPrList) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPrList]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Try to parse as URL
    const urlParse = parseGitHubPrUrl(val);
    if (urlParse) {
      const next = {
        ...formValue,
        owner: urlParse.owner,
        repo: urlParse.repo,
        pullNumber: urlParse.pullNumber,
      };
      setFormValue(next);
      onChange(next, true);
      setInputValue("");
    }
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");
    const urlParse = parseGitHubPrUrl(pastedText);
    if (urlParse) {
      e.preventDefault();
      const next = {
        ...formValue,
        owner: urlParse.owner,
        repo: urlParse.repo,
        pullNumber: urlParse.pullNumber,
      };
      setFormValue(next);
      onChange(next, true);
      setInputValue("");
    }
  };

  const handleBrowsePrs = async () => {
    const owner = formValue.owner ?? property?.githubPrConfig?.defaultOwner;
    const repo = formValue.repo ?? property?.githubPrConfig?.defaultRepo;

    if (!owner || !repo) {
      setError("Please set owner and repo first");
      return;
    }

    setLoading(true);
    setError(null);
    setShowPrList(true);

    try {
      const params = new URLSearchParams({
        owner,
        repo,
        state: "all",
        per_page: "50",
      });
      if (property?.githubPrConfig?.installationId) {
        params.append("installation_id", String(property.githubPrConfig.installationId));
      }

      const response = await fetch(`/api/github/pulls?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch pull requests");
      }
      const data = await response.json();
      setPrs(data.prs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PRs");
      setPrs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPr = (pr: PullRequest) => {
    const owner = formValue.owner ?? property?.githubPrConfig?.defaultOwner;
    const repo = formValue.repo ?? property?.githubPrConfig?.defaultRepo;

    if (!owner || !repo) {
      setError("Owner and repo are required");
      return;
    }

    const next = {
      owner,
      repo,
      pullNumber: pr.number,
    };
    setFormValue(next);
    onChange(next, true);
    setShowPrList(false);
    setInputValue("");
  };

  const handleSync = () => {
    // Pass the full PR value to trigger a re-sync
    // This will fetch fresh PR status from GitHub and update the status property
    const syncValue: GitHubPrValue = {
      owner: formValue.owner,
      repo: formValue.repo,
      pullNumber: formValue.pullNumber,
      installationId: formValue.installationId,
    };
    
    // Remove cached fields so backend fetches fresh data
    delete syncValue.state;
    delete syncValue.merged;
    delete syncValue.title;
    delete syncValue.url;
    delete syncValue.lastSyncedAt;
    
    onChange(syncValue, true);
  };

  const statusMeta = getGitHubPrStatusMeta(formValue);
  const hasLinkedPr = Boolean(formValue.title || formValue.number || formValue.pullNumber);
  const defaultOwner = formValue.owner ?? property?.githubPrConfig?.defaultOwner;
  const defaultRepo = formValue.repo ?? property?.githubPrConfig?.defaultRepo;

  return (
    <div className="flex p-2 flex-col gap-2 w-[300px]">
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onPaste={handleInputPaste}
            placeholder={
              defaultOwner && defaultRepo
                ? `Paste PR URL or #${defaultOwner}/${defaultRepo}/...`
                : "Paste PR URL (e.g., github.com/owner/repo/pull/123)"
            }
            className="flex-1 px-2 py-1.5 text-sm rounded-md border bg-transparent focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={handleBrowsePrs}
            disabled={!defaultOwner || !defaultRepo || loading}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="w-3.5 h-3.5" />
            Browse
          </button>
        </div>

        {showPrList && (
          <div className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
            {loading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
            ) : error ? (
              <div className="px-3 py-2 text-sm text-red-600">{error}</div>
            ) : prs.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No pull requests found</div>
            ) : (
              <div className="py-1">
                {prs.map((pr) => {
                  const prStatusMeta = getGitHubPrStatusMeta({
                    state: pr.state,
                    merged: pr.merged,
                    draft: pr.draft,
                  });
                  return (
                    <button
                      key={pr.number}
                      type="button"
                      onClick={() => handleSelectPr(pr)}
                      className="w-full px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">#{pr.number} {pr.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                prStatusMeta.tone === "success"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                                  : prStatusMeta.tone === "danger"
                                    ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
                                    : prStatusMeta.tone === "muted"
                                      ? "bg-muted text-muted-foreground"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-100"
                              }`}
                            >
                              {prStatusMeta.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {hasLinkedPr ? (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium truncate">
              {formValue.title || `#${formValue.pullNumber ?? formValue.number ?? ""}`}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSync}
                className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                title="Sync PR status from GitHub"
              >
                <RefreshCw className="w-3 h-3" />
                Sync
              </button>
              {formValue.url && (
                <a
                  href={formValue.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs inline-flex items-center gap-1 text-primary hover:underline"
                >
                  View
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                statusMeta.tone === "success"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                  : statusMeta.tone === "danger"
                    ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
                    : statusMeta.tone === "muted"
                      ? "bg-muted text-muted-foreground"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-100"
              }`}
            >
              {statusMeta.label}
            </span>
            {defaultOwner && defaultRepo && (
              <span className="truncate text-[11px]">
                {defaultOwner}/{defaultRepo}
              </span>
            )}
            {formValue.lastSyncedAt && (
              <span className="text-[11px]">
                Synced {new Date(formValue.lastSyncedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs m-0 text-muted-foreground">
          The linked status will be kept in sync
          automatically.
        </p>
      )}
    </div>
  );
}

