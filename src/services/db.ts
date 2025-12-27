// import { drizzle } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "@/drizzle/schema";
import cloudflareRemoteCallback from "./cloudflareRemoteCallback";

// TODO: production
// export const createDb = (d1: D1Database) => {
//   return drizzle(d1, { schema, logger: true });
// };
// export type Database = ReturnType<typeof createDb>;


export const db = drizzle(cloudflareRemoteCallback, { schema });

export type DrizzleClient = typeof db;

