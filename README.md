# Mining Compliance Command Center

Existing React/TanStack compliance application configured for a fresh Supabase backend.

## Migration target

- Supabase project ID: `tpyokpafkbtaxqavjpzf`
- Supabase project URL: `https://tpyokpafkbtaxqavjpzf.supabase.co`
- Supabase client initialization uses the base project URL, not `/rest/v1/`.
- No historical application data, users, audit history, settings values, document metadata, or Storage files are included in this repository.

The application UI, routes, modules, and workflows are unchanged by the backend migration.

## Technology

- React 19 + TypeScript
- TanStack Start / TanStack Router
- Vite
- TanStack Query
- Tailwind CSS
- Supabase JS
- Recharts
- shadcn/Radix UI components

## Application modules

- Dashboard
- Compliance Calendar
- Compliance Management
- Notices & Violations
- Inspection Management
- Licenses & Permits
- Document Vault
- Reports & Analytics
- Settings / master data
- Administration

## Environment configuration

Copy `.env.example` when creating a new deployment environment and provide the target Supabase values.

Required application variables:

```env
SUPABASE_PROJECT_ID="your-project-id"
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-publishable-key"

VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only and is not required by the currently audited application flows. Never expose a service-role/secret key through a `VITE_` variable or frontend code.

## Fresh Supabase backend setup

The `supabase/migrations/` directory is the source of truth for the fresh backend structure.

Apply migrations in filename order to the new Supabase project. They create:

### Core tables

- `compliances`
- `notices`
- `inspections`
- `inspection_observations`
- `licenses`

### Master tables

- `authorities`
- `categories`
- `types`
- `mines`
- `leases`
- `departments`
- `responsible_persons`
- `priorities`
- `statuses`
- `recurring_rules`

### Application support tables

- `users`
- `documents`
- `audit_logs`
- `system_settings`

The final completion migration also creates the required Storage buckets and Realtime publication membership.

## Storage

Fresh buckets:

- `documents` — public, because the existing Document Vault uses `getPublicUrl()`
- `notice-documents` — private, accessed with signed URLs
- `inspection-evidence` — private, accessed with signed URLs

No Storage objects are included or migrated.

## Realtime

The dashboard subscribes to Postgres changes for:

- `compliances`
- `licenses`
- `inspections`

The final migration adds these tables to the standard `supabase_realtime` publication when available.

## RLS baseline

RLS remains enabled.

The original committed application already operates through the browser publishable client without an enforced login flow. The fresh-backend migration preserves only the operations the existing frontend requires rather than introducing a new RBAC/authentication architecture.

For the four support tables added by the completion migration:

- `users`: read/create/update/delete
- `documents`: read/create/update/delete
- `audit_logs`: read only from the client
- `system_settings`: read/update only from the client

The existing committed migrations preserve their current RLS behavior for the other application tables.

## Authentication

The repository includes Supabase session/token plumbing, but the current UI does not implement a login, registration, OAuth, OTP, password reset, or MFA flow. No old Supabase Auth users are migrated.

Do not add a new authentication architecture as part of this backend move unless separately approved.

## Install and run

The repository contains both Bun and npm lockfiles from the original project. Bun is the documented workflow.

```bash
bun install
bun run dev
```

Production build:

```bash
bun run build
```

Equivalent npm scripts are available through `package.json` if npm is used in the deployment environment.

## Supabase CLI example

With Supabase CLI authenticated separately and the project linked using your own administrative credentials:

```bash
supabase link --project-ref tpyokpafkbtaxqavjpzf
supabase db push
```

Administrative credentials/database passwords must remain outside frontend source control.

## Fresh-backend verification

After the migrations are applied to the new project:

1. Start the application using the new environment variables.
2. Verify Dashboard/Calendar reads against the new project.
3. Create, edit, and delete a fresh Compliance.
4. Create a fresh Notice and upload/delete a new attachment.
5. Create a fresh Inspection with observations and evidence.
6. Create/edit/delete a fresh License.
7. Create/edit/delete master-data records.
8. Create/edit/delete an Administration user record.
9. Upload a new Document Vault file and confirm the object is in the new `documents` bucket.
10. Verify dashboard Realtime updates for compliances, licenses, and inspections.
11. Confirm no historical rows, users, or Storage objects exist in the new project.

## Lovable-related build dependency

Lovable project metadata that is not required at runtime can be removed independently. The current build still imports `@lovable.dev/vite-tanstack-config`, which supplies required Vite/TanStack/Tailwind/Nitro configuration. It is intentionally retained until an equivalent standalone build configuration is implemented and verified separately.

## Important migration rule

This repository is intended for a **fresh** Supabase project. Do not import old production rows, old Supabase Auth users, old audit logs, old settings values, or old Storage objects unless a separate data-migration task is explicitly approved.
