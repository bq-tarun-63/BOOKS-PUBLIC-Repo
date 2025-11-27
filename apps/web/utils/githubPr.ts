export type GitHubPrState = "open" | "closed" | undefined;

export interface GitHubPrValue {
  owner?: string;
  repo?: string;
  pullNumber?: number | string;
  number?: number;
  title?: string;
  state?: GitHubPrState;
  merged?: boolean;
  draft?: boolean;
  url?: string;
  lastSyncedAt?: string;
  headSha?: string;
  baseSha?: string;
  installationId?: number;
}

/**
 * Parses a GitHub PR URL and extracts owner, repo, and PR number
 * Supports formats like:
 * - https://github.com/owner/repo/pull/123
 * - https://github.com/owner/repo/pulls/123
 * - github.com/owner/repo/pull/123
 */
export function parseGitHubPrUrl(url: string): { owner: string; repo: string; pullNumber: number } | null {
  try {
    // Remove protocol if present
    const cleanUrl = url.replace(/^https?:\/\//, "").replace(/^www\./, "");
    
    // Match patterns like: github.com/owner/repo/pull/123 or owner/repo/pull/123
    const match = cleanUrl.match(/(?:github\.com\/)?([^\/]+)\/([^\/]+)\/pull\/(\d+)/i);
    if (match) {
      const owner = match[1];
      const repo = match[2];
      const pullNumberStr = match[3];
      if (owner && repo && pullNumberStr) {
        return {
          owner,
          repo,
          pullNumber: parseInt(pullNumberStr, 10),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function normalizeGitHubPrValue(value: unknown): GitHubPrValue {
  if (!value) {
    return {};
  }
  if (typeof value === "object") {
    return value as GitHubPrValue;
  }
  if (typeof value === "string") {
    // First try to parse as URL
    const urlParse = parseGitHubPrUrl(value);
    if (urlParse) {
      return {
        owner: urlParse.owner,
        repo: urlParse.repo,
        pullNumber: urlParse.pullNumber,
      };
    }
    
    // Then try JSON parse
    try {
      const parsed = JSON.parse(value) as GitHubPrValue;
      return parsed ?? {};
    } catch {
      // If it's just a number, treat as PR number
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        return { pullNumber: num };
      }
      return {};
    }
  }
  return {};
}

export function getGitHubPrStatusMeta(pr: GitHubPrValue): {
  label: string;
  tone: "default" | "success" | "danger" | "muted";
} {
  if (pr.merged) {
    return { label: "Merged", tone: "success" };
  }
  if (pr.state === "closed") {
    return { label: "Closed", tone: "muted" };
  }
  if (pr.state === "open") {
    return { label: pr.draft ? "Draft" : "Open", tone: pr.draft ? "muted" : "default" };
  }
  return { label: "Pending", tone: "muted" };
}

