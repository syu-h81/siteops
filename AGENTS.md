# SiteOps Development Rules

## Project Overview

SiteOps is a SaaS for managing website maintenance
operations for web agencies and freelancers.

## Requirements

Before implementation, read:

- docs/SiteOps_v0.1_requirements.md

Follow the requirements document as the source of truth.

Do not implement features outside the requirements.

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- Supabase Auth
- Zod

## Directory Structure

- src/app: Pages and routing
- src/components: Reusable UI components
- src/features: Feature-specific components and logic
- src/lib: Supabase clients and shared utilities
- src/hooks: Custom React hooks
- src/types: TypeScript types
- supabase/migrations: Database migrations
- docs: Project documentation

## Coding Rules

- Use TypeScript strict mode.
- Use 2 spaces for indentation.
- Prefer Server Components.
- Use Client Components only when necessary.
- Keep components small and reusable.
- Avoid unnecessary dependencies.
- Validate user input with Zod.
- Use Japanese for all user-facing UI text.
- Do not use `any` unless absolutely necessary.

## Security

- Enable Row Level Security (RLS).
- Enforce organization-level data isolation.
- Validate authorization on the server.
- Never expose Supabase service role keys to the client.
- Never commit secrets or environment variables.
- Do not store client passwords or server credentials.

## Development Workflow

1. Read the requirements document.
2. Review the current project structure.
3. Propose an implementation plan.
4. Implement one phase at a time.
5. Run lint, type checks, and relevant tests.
6. Report changed files and test results.
7. Wait for approval before starting the next phase.

## Git Rules

- main: Production branch
- develop: Integration branch
- feature/*: Feature development branches

Do not commit or push without user approval.

## Important

- Do not modify unrelated files.
- Do not add unnecessary features.
- Ask questions when requirements are unclear.
- Prioritize MVP development.