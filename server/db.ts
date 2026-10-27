import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Create .env from .env.example and set MySQL connection string.",
  );
}

export const pool = createPool(process.env.DATABASE_URL);
export const db = drizzle(pool, { schema, mode: "default" });
