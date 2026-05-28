import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

function buildClient() {
  const tursoUrl = process.env.TURSO_URL;
  const tursoToken = process.env.TURSO_TOKEN;

  if (tursoUrl) {
    return createClient({ url: tursoUrl, authToken: tursoToken });
  }

  return createClient({
    url: process.env.DATABASE_URL ?? "file:./data.db",
  });
}

const client = buildClient();
export const db = drizzle(client, { schema });
export type DB = typeof db;
