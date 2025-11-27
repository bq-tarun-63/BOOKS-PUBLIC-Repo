# Codex Agent Instructions

This repository hosts **BetaQue Notes**, a Notion‑style WYSIWYG editor with AI-powered autocompletions. It is a monorepo managed by `pnpm` and `turbo` and primarily uses **Next.js** with **TypeScript**.

## Key directories
- `apps/web/` – main Next.js application.
- `packages/headless/` – reusable editor components.
- `packages/tsconfig/` – shared tsconfig settings.

## Development commands
- `pnpm install` – install all dependencies.
- `pnpm dev` – start the development server.
- `pnpm build` – build all packages and apps via Turbo.
- `pnpm lint` – run Biome lint on the workspace.
- `pnpm format` – check code formatting.
- `pnpm format:fix` – automatically fix formatting issues.
- `pnpm typecheck` – run TypeScript type checks.

Always run **`pnpm build`** after commiting and wait for atleast 2 minutes for build process to get completed, 
If the build fails, fix the issues and rerun `pnpm build` until it succeeds, and then commit again


## Commit guidelines
This project uses [commitlint](https://commitlint.js.org/#/). Commit messages must follow the Conventional Commits convention, e.g. `feat: add sharing dialog`.


## Agent etiquette
- Prefer TypeScript and existing patterns when adding new code.
- Keep code formatted using Biome.
- Ensure imports are organized automatically.
- When updating docs, mention relevant commands.
- Run `pnpm run build` after finishing each task and after commiting and fix any build errors.
- Wait for atleast 2 minutes for `pnpm run build` process to get completed


