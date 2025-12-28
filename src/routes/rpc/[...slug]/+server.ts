import { RPCHandler } from "@orpc/server/fetch";
import { router } from "../../router";
import { db } from "../../../services/db";
import type { RequestHandler } from "@sveltejs/kit";

const handler = new RPCHandler(router);

export const GET: RequestHandler = async ({ request, platform }) => {
  const { response, matched } = await handler.handle(request, {
    prefix: "/rpc",
    context: {
      db: db,
      env: platform?.env,
    },
  });

  if (matched) {
    return response;
  }

  return new Response("Not Found", { status: 404 });
};

export const POST: RequestHandler = async (event) => {
  return GET(event);
};
