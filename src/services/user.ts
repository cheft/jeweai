import { ORPCError, os } from '@orpc/server'
import * as z from 'zod'
// import db from '@/server/db' // Removed: accessing via context for D1
import { users } from '@/drizzle/schema'
import { eq, sql, desc, innerProduct } from 'drizzle-orm'

const UserSchema = z.object({
  id: z.string().nullable().optional(),
  username: z.string(),
  password: z.string(),
  nickname: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
})

export const me = os
  .input(z.void().optional()) // Input not really needed for 'me'
  .handler(async ({ context }: { context: any }) => {
    const db = context.db;
    const userId = context.userId;

    if (!userId) {
      return null;
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.nickname || user.username,
      credits: 10, // Default for now, maybe add to schema later
      plan: 'free' as const
    }
  })


export const testFile = os
  .input(z.object({ anyFieldName: z.instanceof(File) }))
  .output(z.object({ anyFieldName: z.instanceof(File) }))
  .handler(async ({ input }) => {
    console.log(input)
    return {
      anyFieldName: new File(['Hello World'], 'hello.txt', { type: 'text/plain' }),
    }
  })
