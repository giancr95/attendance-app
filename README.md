# LCDP Attendance

Attendance & HR app for **LaCasaDelPlastico**. Reads punches from a ZKTeco
MB10-VL biometric device and manages employees, permits, and vacations.

Stack:

- Next.js 16 (App Router, standalone output)
- NextAuth v5 (credentials, JWT sessions)
- Prisma 7 + PostgreSQL
- Tailwind v4 + shadcn/base-ui components

---

## Routes

| Path         | Purpose                                    |
| ------------ | ------------------------------------------ |
| `/login`     | Email + password sign-in                   |
| `/`          | Dashboard with KPIs and latest punches     |
| `/employees` | Roster synced from the ZKTeco device       |
| `/punches`   | Paginated attendance log                   |
| `/permits`   | Permit requests + approvals                |
| `/vacations` | Vacation requests + approvals              |

All routes except `/login` are protected by a NextAuth proxy (`src/proxy.ts`).

---

## Environment variables

See [`.env.example`](./.env.example). The app expects:

- `DATABASE_URL` — Postgres connection string.
- `AUTH_SECRET` — NextAuth v5 secret (`openssl rand -base64 32`).
- `ADMIN_PASSWORD` — only used by the first `prisma db seed` run to create the
  admin account (Gianca).

---

## Deploying to Coolify

This repo is designed to run as a Docker service inside
[Coolify](https://coolify.io/) on a DigitalOcean droplet, alongside a
Coolify-managed Postgres service.

1. **Create a Postgres resource** in Coolify. Note the service name (usually
   `postgres`) — you'll use it in the connection string.
2. **Create a new "Application" resource** pointing at this GitHub repo. Build
   pack: **Dockerfile**. The repo already contains a multi-stage
   [`Dockerfile`](./Dockerfile) and a
   [`docker-entrypoint.sh`](./docker-entrypoint.sh) that runs
   `prisma migrate deploy` on every container start.
3. **Set environment variables** on the application:
   ```
   DATABASE_URL=postgresql://<user>:<pass>@<postgres-service>:5432/<db>?schema=public
   AUTH_SECRET=<openssl rand -base64 32>
   ADMIN_PASSWORD=<a strong password, only needed for the first seed>
   ```
4. **Deploy**. Coolify will build the image, start the container, and the
   entrypoint will run migrations automatically.
5. **Seed the admin user** (one-time). Open a shell into the running container
   from the Coolify UI and run:
   ```sh
   ADMIN_PASSWORD=<same value> node ./node_modules/prisma/build/index.js db seed
   ```
   After this, log in at `/login` as `giancr95@gmail.com` with the
   `ADMIN_PASSWORD` you set.

---

## Local notes

The app is **not** intended to run locally on Windows — it needs LAN access to
the MB10-VL device (192.168.1.202), which lives on the same network as the
droplet. Develop against the Coolify preview deployments instead.

If you do want to run it locally for quick UI work:

```sh
npm install
# point DATABASE_URL at a local postgres
npx prisma generate
npx prisma migrate deploy
npm run dev
```
