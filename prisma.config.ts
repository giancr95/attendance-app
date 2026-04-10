// Prisma 7 config. The Prisma CLI / schema-engine requires the datasource to
// be declared here (it does not infer it from `env("DATABASE_URL")` in the
// schema for `migrate diff`). dotenv loads `.env` for local CLI runs; in
// production, Coolify injects DATABASE_URL directly into process.env.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});
