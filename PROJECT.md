# Project Map

This repository hosts **BetaQue Notes**, a Notion-style WYSIWYG editor with AI-powered autocompletions. The monorepo is managed with **pnpm** and **Turbo**.

## Repository Layout

- **apps/web/** – Next.js application and API routes
- **packages/headless/** – reusable editor components built with Tiptap
- **packages/tsconfig/** – shared TypeScript configuration
- **AGENTS.md** – instructions for Codex agents
- **README.md** – project introduction and setup
- **turbo.json** – Turbo build pipeline
- **biome.json / prettier.config.js** – linting and formatting rules

## apps/web

Main Next.js app. Important folders:

- **app/** – pages and API endpoints
  - `api/` – REST endpoints (create notes, update notes, file uploads, etc.)
  - `notes/` – note editing pages
- **components/** – React components
  - `auth/` – authentication helpers
  - `tailwind/` – editor UI components
  - `tailwind/generative` – AI completion menu
  - `tailwind/selectors` – color, math and node selectors
  - `tailwind/ui` – UI primitives (buttons, popovers, sidebar, etc.)
- **hooks/** – custom React hooks for fetching and updating notes
- **lib/** – server/client utilities (MongoDB connection, GitHub helpers, config)
- **models/** – Mongoose schemas (`User`, `Note`)
- **services/** – business logic for notes, users
- **utils/** – helper utilities (permission checks, email notifications)
- **tests/** – Vitest tests

## packages/headless

Standalone editor package used by the web app.

- **src/components/** – EditorRoot, command palette and bubble menu components
- **src/extensions/** – Tiptap extensions such as AI highlight, image resizer, math, etc.
- **src/plugins/** – editor plugins (e.g., image upload handler)
- **src/utils/** – helper functions and atoms

Compiled with **tsup**. Exports are defined in `src/index.ts`.

## packages/tsconfig

Shared TypeScript configurations (`base.json`, `next.json`, `react.json`). Other packages extend these settings.

## Development

Common scripts (defined in `package.json`):

- `pnpm dev` – start the development server
- `pnpm build` – build all packages via Turbo
- `pnpm lint` – run Biome lint
- `pnpm format` – check formatting
