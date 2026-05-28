import { defineConfig } from "drizzle-kit";

const tursoUrl = process.env.TURSO_URL;
const tursoToken = process.env.TURSO_TOKEN;
const databaseUrl = process.env.DATABASE_URL ?? "file:./data.db";

export default defineConfig({
  dialect: "turso",
  schema: "./db/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: tursoUrl
    ? { url: tursoUrl, authToken: tursoToken }
    : { url: databaseUrl },
});
