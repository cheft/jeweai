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
  .input(
    UserSchema.pick({})
  )
  .handler(async ({ input, context }: { input: any, context: any }) => { // Type strictness might be needed
    const db = context.db;
    // const user = await db.findFirst(users).where(eq(users.id, '1111111'))
    // console.log(user)
    return { 'hello': 'world' }
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
