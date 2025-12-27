import type { AsyncRemoteCallback } from "drizzle-orm/sqlite-proxy";
import Cloudflare, { APIError } from "cloudflare";

import {
  CLOUDFLARE_D1_TOKEN,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_DATABASE_ID,
} from "$env/static/private";

console.log("D1 =====:", CLOUDFLARE_DATABASE_ID, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_TOKEN);

const client = new Cloudflare({
  apiToken: CLOUDFLARE_D1_TOKEN,
});

const cloudflareRemoteCallback: AsyncRemoteCallback = async (
  sql: string,
  params: any[],
  method: "run" | "all" | "values" | "get",
) => {
  console.log("D1 Query:", { sql, params, method });
  try {
    const queryResult = await client.d1.database.query(CLOUDFLARE_DATABASE_ID, {
      account_id: CLOUDFLARE_ACCOUNT_ID,
      sql: sql,
      params: params,
    });
    console.log("D1 Result:", JSON.stringify(queryResult, null, 2));

    const firstResult = queryResult.result?.[0];

    if (!firstResult) {
      throw new Error("Unexpected response format from Cloudflare D1");
    }

    const rows = (firstResult.results || []).map((row: any) => Object.values(row));

    return Promise.resolve({ rows });

  } catch (error) {
    console.error("D1 Error:", error);
    let handledError = String(error);

    if (error instanceof APIError) {
      handledError = error.errors
        .map((err) => `${err.code}: ${err.message}`)
        .join(", ");
    } else if (error instanceof Error) {
      handledError = error.message;
    }

    throw new Error(handledError, {});
  }
};

export default cloudflareRemoteCallback;