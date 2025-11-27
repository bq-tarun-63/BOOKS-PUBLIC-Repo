"use client";

type ProviderEmbedOptions = {
  height?: number;
  width?: number;
  allow?: string;
  sandbox?: string;
  referrerPolicy?: string;
};

export type EmbedResolution =
  | {
      status: "ok";
      src: string;
      options?: ProviderEmbedOptions;
    }
  | {
    status: "blocked";
    provider: string;
    message: string;
    helpUrl?: string;
  }
  | {
      status: "github-preview";
      url: string;
      type: "repository" | "pull" | "issue" | "gist";
      owner?: string;
      repo?: string;
      number?: string;
    }
  | {
      status: "error";
      message: string;
    };

type ProviderDefinition = {
  id: string;
  label: string;
  test: (url: URL) => boolean;
  resolve: (url: URL) => EmbedResolution;
};

const BLOCKED_HOSTS: Array<{ label: string; hosts: string[]; helpUrl?: string }> = [
  {
    label: "GitHub",
    hosts: ["github.com", "gist.github.com", "githubusercontent.com"],
    helpUrl: "https://docs.github.com/en/rest",
  },
  {
    label: "Slack",
    hosts: ["slack.com"],
    helpUrl: "https://api.slack.com/",
  },
  {
    label: "Jira",
    hosts: ["atlassian.net", "jira.com"],
    helpUrl: "https://developer.atlassian.com/",
  },
];

function isPdf(url: URL) {
  return url.pathname.toLowerCase().endsWith(".pdf");
}

function buildDocsViewer(url: URL) {
  return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url.href)}`;
}

function extractGoogleDriveId(url: URL): string | null {
  const fileMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) return fileMatch[1];
  const ucId = url.searchParams.get("id");
  return ucId ?? null;
}

function googleDocsPreview(url: URL, type: "document" | "spreadsheets" | "presentation") {
  const match = url.pathname.match(/\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
  const id = match && match[2] ? match[2] : null;
  if (!id) return null;
  const base = `https://docs.google.com/${type}/d/${id}/preview`;
  return base;
}

function normalizeYouTube(url: URL): string | null {
  // youtu.be
  if (url.hostname.includes("youtu.be")) {
    const videoId = url.pathname.replace("/", "");
    const start = url.searchParams.get("t") || url.searchParams.get("start");
    const startParam = start ? `?start=${parseInt(start, 10) || 0}` : "";
    return `https://www.youtube.com/embed/${videoId}${startParam}`;
  }
  // youtube.com
  if (url.searchParams.has("v")) {
    const videoId = url.searchParams.get("v");
    if (!videoId) return null;
    const start = url.searchParams.get("t") || url.searchParams.get("start");
    const params = new URLSearchParams();
    params.set("rel", "0");
    if (start) params.set("start", `${parseInt(start, 10) || 0}`);
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }
  const shortMatch = url.pathname.match(/\/(shorts|embed|v)\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) {
    return `https://www.youtube.com/embed/${shortMatch[2]}`;
  }
  return null;
}

function normalizeVimeo(url: URL): string | null {
  const match = url.pathname.match(/\/(\d+)/);
  if (!match) return null;
  return `https://player.vimeo.com/video/${match[1]}`;
}

function normalizeLoom(url: URL): string | null {
  const match = url.pathname.match(/\/(share|embed)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  return `https://www.loom.com/embed/${match[2]}`;
}

function normalizeFigma(url: URL): string {
  return `https://www.figma.com/embed?embed_host=betaque&url=${encodeURIComponent(url.href)}`;
}

function normalizeSpotify(url: URL): string {
  return `https://open.spotify.com/embed${url.pathname}${url.search}`;
}

function normalizeCodepen(url: URL): string | null {
  const match = url.pathname.match(/\/([^/]+)\/pen\/([^/]+)/);
  if (!match) return null;
  return `https://codepen.io/${match[1]}/embed/${match[2]}?default-tab=result`;
}

function normalizeSoundcloud(url: URL): string {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.href)}&color=%23ff5500&auto_play=false&hide_related=false&show_teaser=true`;
}

function normalizeGoogleMap(url: URL): string {
  const query = url.searchParams.get("q") || url.pathname.replace("/maps/", "");
  return `https://www.google.com/maps?q=${encodeURIComponent(query || url.href)}&output=embed`;
}

function parseGitHubUrl(url: URL): { type: "repository" | "pull" | "issue" | "gist"; owner?: string; repo?: string; number?: string } | null {
  if (url.hostname !== "github.com" && url.hostname !== "gist.github.com") {
    return null;
  }

  const pathParts = url.pathname.split("/").filter(Boolean);

  // Repository: github.com/owner/repo
  if (pathParts.length === 2 && url.hostname === "github.com") {
    return {
      type: "repository",
      owner: pathParts[0],
      repo: pathParts[1],
    };
  }

  // Pull request: github.com/owner/repo/pull/123
  if (pathParts.length === 4 && pathParts[2] === "pull" && url.hostname === "github.com") {
    return {
      type: "pull",
      owner: pathParts[0],
      repo: pathParts[1],
      number: pathParts[3],
    };
  }

  // Issue: github.com/owner/repo/issues/123
  if (pathParts.length === 4 && pathParts[2] === "issues" && url.hostname === "github.com") {
    return {
      type: "issue",
      owner: pathParts[0],
      repo: pathParts[1],
      number: pathParts[3],
    };
  }

  // Gist: gist.github.com/username/gist-id
  if (url.hostname === "gist.github.com" && pathParts.length >= 1) {
    return {
      type: "gist",
      owner: pathParts[0],
    };
  }

  return null;
}

const PROVIDERS: ProviderDefinition[] = [
  {
    id: "github-preview",
    label: "GitHub Preview",
    test: (url) => {
      if (url.hostname === "github.com" || url.hostname === "gist.github.com") {
        return parseGitHubUrl(url) !== null;
      }
      return false;
    },
    resolve: (url) => {
      const parsed = parseGitHubUrl(url);
      if (!parsed) {
        return {
          status: "blocked",
          provider: "GitHub",
          message: "GitHub does not allow embedding. Use the dedicated integration or open the link in a new tab.",
          helpUrl: "https://docs.github.com/en/rest",
        };
      }
      return {
        status: "github-preview",
        url: url.href,
        ...parsed,
      };
    },
  },
  {
    id: "blocked",
    label: "Blocked providers",
    test: (url) => BLOCKED_HOSTS.some((entry) => entry.hosts.includes(url.hostname)),
    resolve: (url) => {
      const entry = BLOCKED_HOSTS.find((item) => item.hosts.includes(url.hostname));
      return {
        status: "blocked",
        provider: entry?.label ?? url.hostname,
        message: `${entry?.label ?? "This provider"} does not allow embedding. Use the dedicated integration or open the link in a new tab.`,
        helpUrl: entry?.helpUrl,
      };
    },
  },
  {
    id: "pdf",
    label: "PDF",
    test: (url) => isPdf(url),
    resolve: (url) => ({
      status: "ok",
      src: buildDocsViewer(url),
      options: { height: 520 },
    }),
  },
  {
    id: "google-drive-file",
    label: "Google Drive",
    test: (url) =>
      ["drive.google.com", "docs.google.com"].includes(url.hostname) &&
      (url.pathname.includes("/file/") || url.searchParams.has("id") || url.pathname.includes("/document/") ||
        url.pathname.includes("/spreadsheets/") || url.pathname.includes("/presentation/")),
    resolve: (url) => {
      if (url.hostname === "docs.google.com") {
        if (url.pathname.includes("/document/")) {
          const preview = googleDocsPreview(url, "document");
          if (preview) {
            return { status: "ok", src: preview, options: { height: 600 } };
          }
        }
        if (url.pathname.includes("/spreadsheets/")) {
          const preview = googleDocsPreview(url, "spreadsheets");
          if (preview) {
            return { status: "ok", src: preview, options: { height: 600 } };
          }
        }
        if (url.pathname.includes("/presentation/")) {
          const preview = googleDocsPreview(url, "presentation");
          if (preview) {
            return { status: "ok", src: preview, options: { height: 480 } };
          }
        }
      }

      const driveId = extractGoogleDriveId(url);
      if (driveId) {
        return {
          status: "ok",
          src: `https://drive.google.com/file/d/${driveId}/preview`,
          options: { height: 520 },
        };
      }
      return {
        status: "error",
        message: "Unable to resolve Google Drive file. Please use the 'Share > Publish to web' option.",
      };
    },
  },
  {
    id: "google-maps",
    label: "Google Maps",
    test: (url) => url.hostname.includes("google") && url.pathname.includes("/maps"),
    resolve: (url) => ({
      status: "ok",
      src: normalizeGoogleMap(url),
      options: { height: 400 },
    }),
  },
  {
    id: "youtube",
    label: "YouTube",
    test: (url) => url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be"),
    resolve: (url) => {
      const normalized = normalizeYouTube(url);
      if (!normalized) {
        return { status: "error", message: "Unable to determine YouTube video id." };
      }
      return {
        status: "ok",
        src: normalized,
        options: {
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        },
      };
    },
  },
  {
    id: "vimeo",
    label: "Vimeo",
    test: (url) => url.hostname.includes("vimeo.com"),
    resolve: (url) => {
      const normalized = normalizeVimeo(url);
      if (!normalized) {
        return { status: "error", message: "Unable to determine Vimeo video id." };
      }
      return {
        status: "ok",
        src: normalized,
        options: { allow: "autoplay; fullscreen; picture-in-picture" },
      };
    },
  },
  {
    id: "loom",
    label: "Loom",
    test: (url) => url.hostname.includes("loom.com"),
    resolve: (url) => {
      const normalized = normalizeLoom(url);
      if (!normalized) {
        return { status: "error", message: "Unable to determine Loom video id." };
      }
      return { status: "ok", src: normalized, options: { allow: "autoplay; fullscreen" } };
    },
  },
  {
    id: "figma",
    label: "Figma",
    test: (url) => url.hostname.includes("figma.com"),
    resolve: (url) => ({
      status: "ok",
      src: normalizeFigma(url),
      options: { height: 520 },
    }),
  },
  {
    id: "codepen",
    label: "CodePen",
    test: (url) => url.hostname.includes("codepen.io") && url.pathname.includes("/pen/"),
    resolve: (url) => {
      const normalized = normalizeCodepen(url);
      if (!normalized) {
        return { status: "error", message: "Unable to determine CodePen slug." };
      }
      return {
        status: "ok",
        src: normalized,
        options: { height: 520 },
      };
    },
  },
  {
    id: "spotify",
    label: "Spotify",
    test: (url) => url.hostname.includes("spotify.com"),
    resolve: (url) => ({
      status: "ok",
      src: normalizeSpotify(url),
      options: { height: 380, allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" },
    }),
  },
  {
    id: "soundcloud",
    label: "SoundCloud",
    test: (url) => url.hostname.includes("soundcloud.com"),
    resolve: (url) => ({
      status: "ok",
      src: normalizeSoundcloud(url),
      options: { height: 166 },
    }),
  },
  {
    id: "default",
    label: "Default",
    test: () => true,
    resolve: (url) => ({
      status: "ok",
      src: url.href,
    }),
  },
];

export function resolveEmbedUrl(rawUrl: string): EmbedResolution {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (error) {
    return {
      status: "error",
      message: "The provided link is not a valid URL.",
    };
  }

  const provider = PROVIDERS.find((item) => {
    try {
      return item.test(parsed);
    } catch {
      return false;
    }
  });

  if (!provider) {
    return {
      status: "error",
      message: "Unable to determine how to embed this link.",
    };
  }

  return provider.resolve(parsed);
}

export const embedProviders = PROVIDERS.map((provider) => ({
  id: provider.id,
  label: provider.label,
}));


