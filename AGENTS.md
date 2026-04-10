<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LCDP Attendance — architecture

> **Read this first** before adding any feature. It captures the conventions
> the codebase has settled on, why they exist, and the gotchas you'll hit
> if you ignore them.

## Stack

- **Next.js 16** (App Router, standalone build, Turbopack in dev)
- **NextAuth v5** with credentials provider, JWT sessions
- **Prisma 7** + **PostgreSQL** via `@prisma/adapter-pg`
- **Tailwind v4** + **shadcn/base-ui** components (NOT Radix)
- **sonner** for toasts, **zod** for validation
- **pyzk** (Python) for ZKTeco device communication, called from a Node bridge

## Project layout

```
src/
├── app/
│   ├── (app)/                 ← authed pages, share AppLayout w/ sidebar
│   │   ├── employees/
│   │   ├── punches/
│   │   ├── permits/
│   │   ├── vacations/
│   │   ├── reports/
│   │   └── page.tsx           ← dashboard
│   ├── (auth)/login/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   └── sync/              ← token-authed cron endpoint
│   ├── layout.tsx             ← root, mounts <Toaster />
│   └── globals.css            ← Tailwind theme + Inter font setup
├── components/
│   ├── ui/                    ← shadcn primitives (don't edit casually)
│   ├── kpi-card.tsx           ← reusable metric tile
│   ├── page-header.tsx        ← title / subtitle / actions row
│   ├── export-button.tsx      ← CSV download (client)
│   ├── *-dialog.tsx           ← modal forms (e.g. new-permit-dialog)
│   ├── *-review-dialog.tsx    ← approve/deny modals
│   └── *-row-actions.tsx      ← per-row dropdown menus
├── lib/
│   ├── prisma.ts              ← shared PrismaClient instance
│   ├── auth-actions.ts        ← signIn / signOut server actions
│   ├── *-actions.ts           ← server actions per entity
│   ├── zkteco.ts              ← Python bridge wrapper
│   ├── csv.ts                 ← CSV serialization helpers
│   ├── format.ts              ← date/time formatters (CR timezone)
│   └── labels.ts              ← Spanish enum labels (single source of truth)
├── auth.ts                    ← NextAuth config + adapter
├── proxy.ts                   ← middleware (matcher rules)
└── generated/prisma/          ← generated Prisma client (gitignored)

scripts/
└── zk-bridge.py               ← Python pyzk CLI, called by lib/zkteco.ts

prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

## Adding a new feature — the standard playbook

Most features in this app follow the same shape: a list page with KPIs, a
table, a "create" dialog, and a "review" dialog. Here's how to add one
without reinventing the wheel.

### 1. Schema first
- Add the model to `prisma/schema.prisma`
- Add labels to `src/lib/labels.ts` for any new enums
- Run `npx prisma migrate dev --name add_<thing>` inside the dev container:
  ```bash
  docker exec attendance-dev npx prisma migrate dev --name add_thing
  ```
- Prisma client regenerates automatically

### 2. Server actions (`src/lib/<thing>-actions.ts`)
- File starts with `"use server"`
- Use **zod** for input validation (see `permit-actions.ts` for the pattern)
- Auth helpers: `getSession()` + `requireAdmin()` (copy from `permit-actions.ts`)
- Return `ActionResult` discriminated union, never throw to the caller
- Always `revalidatePath()` the affected pages at the end of mutations
- For sync-style actions, accept an optional `{ skipAuth?: boolean }` so the
  cron endpoint can call them without a session — see `sync-actions.ts`

### 3. Client components (`src/components/<thing>-*.tsx`)
- Start with `"use client"`
- Use `useTransition()` for the pending state, NOT a separate `useState`
- Wrap server-action calls in `toast.loading()` → `toast.success/error`,
  passing the `id` to update the same toast
- Forms use `<form onSubmit>`, NOT React 19's `<form action={action}>` —
  the action helper doesn't play nicely with our toast UX
- Dialogs follow `<Dialog open={...} onOpenChange={...}>` controlled pattern
  so you can `setOpen(false)` after a successful submit

### 4. Page (`src/app/(app)/<thing>/page.tsx`)
- Server component (no `"use client"`)
- Fetch with `Promise.all([...])` — never sequence queries
- Layout pattern (see `permits/page.tsx` for the canonical example):
  1. `<PageHeader title subtitle actions={...} />`
  2. KPI grid: `<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">`
  3. `<Card><CardContent className="p-0"><Table>...</Table></CardContent></Card>`

### 5. Sidebar entry
- Add to `NAV` array in `src/components/app-sidebar.tsx`
- Pick an icon from `lucide-react`

### 6. CSV export
- Always flatten data on the server before passing to `<ExportButton>`.
  Server components **cannot** pass functions to client components, so the
  export columns are `{ key: string; header: string }` only — no closures.
- Pattern:
  ```tsx
  const exportRows = items.map((i) => ({
    employee: i.user.name,
    date: formatDate(i.date),
    status: STATUS_LABEL[i.status],
  }));
  // ...
  <ExportButton
    filename="thing.csv"
    rows={exportRows}
    columns={[
      { key: "employee", header: "Empleado" },
      { key: "date", header: "Fecha" },
      { key: "status", header: "Estado" },
    ]}
  />
  ```

## Critical gotchas (read these or waste hours)

### shadcn/base-ui has a `render` prop API
Components like `DropdownMenuTrigger`, `DialogTrigger`, `SidebarMenuButton`,
`DialogClose` use the `render` prop pattern from base-ui:

```tsx
<DropdownMenuTrigger render={<Button variant="ghost" />}>
  Menu
</DropdownMenuTrigger>
```

NOT this:

```tsx
<DropdownMenuTrigger asChild>     {/* ❌ asChild does not exist here */}
  <Button>Menu</Button>
</DropdownMenuTrigger>
```

### `DropdownMenuLabel` requires `<DropdownMenuGroup>`
The label is `MenuPrimitive.GroupLabel` under the hood — using it outside a
group throws "MenuGroupRootContext is missing" at runtime. Always wrap each
label-and-items section in `<DropdownMenuGroup>`.

### Dropdown items: use `onClick`, not `onSelect`
Base UI's `Menu.Item` uses standard `onClick`. `onSelect` is a Radix-ism
and won't fire here.

### Server actions can't take functions across the boundary
You can't pass closures from a server component to a client component. If
you need to transform per-row data for an export or chart, do the
transform inside the server component and pass plain objects.

### Time zones
- Device clock is configured to **America/Costa_Rica (UTC-6, no DST)**
- pyzk returns naive datetimes — `lib/zkteco.ts` appends `-06:00` so JS
  parses them correctly
- Date formatters in `lib/format.ts` always render in CR timezone
- "Today" / "this week" calculations use `startOfTodayCR()` and friends
- Late-arrival cutoff is **08:30 CR == 14:30 UTC**

### Auth has two layers
1. **Page auth**: `proxy.ts` matcher redirects unauth'd requests to `/login`
2. **Action auth**: every server action calls `requireAdmin()` or
   `getSession()` itself

When adding a new public endpoint (token-authed cron, webhooks), update
the matcher in `proxy.ts` to skip it AND have the action accept
`{ skipAuth: true }`.

### The dev container is bind-mounted
- Source lives at `/root/attendance-app/` on the host
- Mounted into the dev container at `/app`
- `node_modules/` is a named volume so HMR doesn't see Linux/Mac binary
  conflicts and `npm install` only runs once
- Port 3001 on the host maps to 3000 in the container
- Browser URL: **http://167.71.169.23:3001**

When changing `next.config.ts`, the dev server auto-restarts. When changing
`prisma/schema.prisma`, you must `npx prisma migrate dev` inside the
container then optionally `npx prisma generate` (Next.js will pick it up
on the next page reload).

## ZKTeco device

- Model: **MB10-VL**, serial UDP3243700044, IP **192.168.1.202:4370**
- Comm password: **123456** (set in `ZKTECO_PASSWORD` env var)
- Reachable from the Coolify droplet via Tailscale subnet route advertised
  by the SERVIDOR Windows machine — DO NOT tag this server in Tailscale,
  the tag's ACL blocks access
- We tried 3 Node.js libraries (zklib-js, node-zklib, zkteco-js) — all
  fail to parse this firmware's responses and none support the comm
  password. **Use the Python bridge** (`scripts/zk-bridge.py`) instead.

## Sync workflow

- Manual: "Sincronizar usuarios" / "Sync Now" buttons (admin-only,
  goes through `lib/sync-actions.ts`)
- Scheduled: `POST /api/sync?token=<SYNC_TOKEN>` (set in env, Coolify
  scheduled task hits this every N minutes)
- Order matters: users sync first (so punches can resolve `userId`),
  then punches
- Punch insert is idempotent thanks to the unique constraint
  `[deviceId, userId, timestamp]` — re-syncing is safe
