import { ORPCError, os } from '@orpc/server'
import * as z from 'zod'
// import db from '@/server/db' // Removed: accessing via context for D1
import { users, creditTransactions } from '@/drizzle/schema'
import { eq, sql, desc } from 'drizzle-orm'

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
      credits: user.credits ?? 0,
      plan: 'free' as const
    }
  })

export const getCreditsHistory = os
  .input(z.void().optional())
  .handler(async ({ context }: { context: any }) => {
    const { db, userId } = context;
    if (!userId) throw new ORPCError('UNAUTHORIZED');

    const history = await db.select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(50);

    return history.map((h: any) => ({
      ...h,
      createdAt: h.createdAt instanceof Date ? h.createdAt.getTime() : h.createdAt
    }));
  })
