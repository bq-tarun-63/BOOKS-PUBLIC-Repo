# page-cms

A tiny client SDK to fetch content from your editor's CMS API. Designed to work seamlessly with the books.betaque.com CMS platform.

## Install

```bash
pnpm add page-cms
```

## Usage (React/Next.js)

```ts
import { createClient } from 'page-cms';

const cms = createClient({
  baseUrl: 'https://books.betaque.com', // Default base URL
  projectId: process.env.NEXT_PUBLIC_CMS_PROJECT_ID || 'your-workspace-id',
});

// Or use the default base URL by omitting it:
const cms = createClient({
  projectId: process.env.NEXT_PUBLIC_CMS_PROJECT_ID || 'your-workspace-id',
});

export async function getHero() {
  return cms.getBySlug('homepage-hero', { locale: 'en-US' });
}
```

## API
- createClient({ baseUrl?, projectId, apiKey?, defaultLocale?, fetchImpl? }) - baseUrl defaults to 'https://books.betaque.com'
- getById(id, { draft?, locale? })
- getBySlug(slug, { draft?, locale? })
- search({ type?, tag?, limit?, offset? })

Returns objects like:
```ts
{
  id: string,
  projectId: string,
  slug?: string,
  locale?: string,
  type: string,
  fields: unknown,
  status: 'draft' | 'published',
  version: number,
  publishedVersion?: number | null,
  createdAt: string,
  updatedAt: string,
}
```

## Notes
- The base URL defaults to `https://books.betaque.com` if not specified
- This SDK expects your app to expose Next.js routes under `/api/cms/*` (added in this repo)
- Prefer server-side usage to avoid exposing API keys
- The projectId should match your workspace ID in the editor