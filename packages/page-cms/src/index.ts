export type CmsContentStatus = 'draft' | 'published';

export interface CmsContent<TFields = unknown> {
  id: string;
  projectId: string;
  slug?: string;
  locale?: string;
  type: string;
  fields: TFields;
  status: CmsContentStatus;
  version: number;
  publishedVersion?: number | null;
  updatedAt: string;
  createdAt: string;
}

export interface CreateClientOptions {
  baseUrl?: string; // Made optional, will default to books.betaque.com
  projectId: string;
  apiKey?: string;
  defaultLocale?: string;
  fetchImpl?: typeof fetch;
}

class ETagCache {
  private store = new Map<string, { etag?: string; value?: unknown; ts: number }>();
  constructor(private ttlMs: number = 60_000) {}
  get<T>(key: string): { etag?: string; value?: T } | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.ts > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return { etag: entry.etag, value: entry.value as T };
  }
  set<T>(key: string, etag: string | undefined, value: T) {
    this.store.set(key, { etag, value, ts: Date.now() });
  }
}

export interface CmsClient {
  getById<TFields = unknown>(id: string, opts?: { draft?: boolean; locale?: string }): Promise<CmsContent<TFields> | null>;
  getBySlug<TFields = unknown>(slug: string, opts?: { draft?: boolean; locale?: string }): Promise<CmsContent<TFields> | null>;
  search<TFields = unknown>(opts?: { type?: string; tag?: string; limit?: number; offset?: number }): Promise<CmsContent<TFields>[]>;
}

export function createClient(options: CreateClientOptions): CmsClient {
  const { 
    baseUrl = 'https://books.betaque.com', // Default to books.betaque.com
    projectId, 
    apiKey, 
    defaultLocale, 
    fetchImpl 
  } = options;
  const doFetch: typeof fetch = fetchImpl ?? (globalThis.fetch as any);
  const cache = new ETagCache(60_000);

  async function request<T>(path: string, query: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
    const url = new URL(`/api/cms${path}`, baseUrl);
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
    const cacheKey = url.toString();
    const cached = cache.get<T>(cacheKey);

    const res = await doFetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(cached?.etag ? { 'If-None-Match': cached.etag } : {}),
      },
    });

    if (res.status === 304 && cached?.value) {
      return cached.value;
    }
    if (!res.ok) {
      if (res.status === 404) return null as unknown as T;
      const text = await res.text();
      throw new Error(`CMS request failed (${res.status}): ${text}`);
    }
    const etag = res.headers.get('ETag') ?? undefined;
    const data = (await res.json()) as T;
    if (etag) cache.set(cacheKey, etag, data);
    return data;
  }

  return {
    async getById<TFields = unknown>(id: string, opts?: { draft?: boolean; locale?: string }) {
      const locale = opts?.locale ?? defaultLocale;
      return request<CmsContent<TFields> | null>(`/contents/${id}`, { projectId, draft: opts?.draft, locale });
    },
    async getBySlug<TFields = unknown>(slug: string, opts?: { draft?: boolean; locale?: string }) {
      const locale = opts?.locale ?? defaultLocale;
      return request<CmsContent<TFields> | null>(`/contents/by-slug/${encodeURIComponent(slug)}`, { projectId, draft: opts?.draft, locale });
    },
    async search<TFields = unknown>(opts?: { type?: string; tag?: string; limit?: number; offset?: number }) {
      return request<CmsContent<TFields>[]>(`/contents`, { projectId, type: opts?.type, tag: opts?.tag, limit: opts?.limit, offset: opts?.offset });
    },
  };
}

export function isServerRuntime() {
  return typeof window === 'undefined';
}

// React helpers
export function createReactHooks(client: CmsClient) {
  async function useCmsContent<TFields = unknown>(opts: { id?: string; slug?: string; locale?: string; draft?: boolean }) {
    if (!isServerRuntime()) {
      throw new Error('useCmsContent should be called in a server environment (e.g., Next.js server).');
    }
    if (!opts.id && !opts.slug) throw new Error('Provide either id or slug');
    if (opts.id) {
      return client.getById<TFields>(opts.id, { draft: opts.draft, locale: opts.locale });
    }
    return client.getBySlug<TFields>(opts.slug as string, { draft: opts.draft, locale: opts.locale });
  }
  return { useCmsContent };
}
