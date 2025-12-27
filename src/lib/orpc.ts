import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { Router } from '@/src/routes/router';
import { onError } from '@orpc/client'



// TODO: env
const link = new RPCLink({
  url: `${typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:5173"
    }/rpc`,
  headers: () => ({
    authorization: 'Bearer ' + localStorage?.getItem('token'),
  }),
  interceptors: [
    onError((error) => {
      console.error(error)
      if ((error as any)?.message === 'UNAUTHORIZED') {
        location.href = '/login'
      }
    })
  ],
});

export const client: RouterClient<Router> = createORPCClient(link);
