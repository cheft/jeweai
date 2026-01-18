import { ORPCError, os } from '@orpc/server'
import * as z from 'zod'
import { users } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

// Simple hash function for demo/prototype purposes
// In a real production app, use bcryptjs or argon2
async function hashPassword(password: string, salt: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const checkEmail = os
  .input(z.object({ email: z.string().email() }))
  .output(z.object({ exists: z.boolean() }))
  .handler(async ({ input, context }: { input: { email: string }, context: any }) => {
    const db = context.db;
    const [user] = await db.select().from(users).where(eq(users.email, input.email));
    return { exists: !!user && user.status === 1 };
  });

export const login = os
  .input(z.object({
    email: z.string().email(),
    password: z.string()
  }))
  .output(z.object({
    user: z.object({
      id: z.string(),
      email: z.string().nullable(),
      name: z.string().nullable(),
      username: z.string().nullable(),
    }).nullable(),
    token: z.string() // In a real app, this might be a JWT
  }))
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const db = context.db;
    const [user] = await db.select().from(users).where(eq(users.email, input.email));

    if (!user || !user.password || !user.salt) {
      throw new ORPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
      });
    }

    const hashed = await hashPassword(input.password, user.salt);
    if (hashed !== user.password) {
      throw new ORPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.nickname,
        username: user.username
      },
      token: 'mock-jwt-token-' + user.id // Demo token
    };
  });

export const registerInit = os
  .input(z.object({ email: z.string().email() }))
  .output(z.object({ success: z.boolean() }))
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const db = context.db;

    // check if user exists
    const [existing] = await db.select().from(users).where(eq(users.email, input.email));

    if (existing && existing.status === 1) {
      throw new ORPCError({
        code: 'CONFLICT',
        message: 'User already exists',
      });
    }

    const activationToken = crypto.randomUUID();

    if (existing) {
      // update existing pending user
      await db.update(users).set({
        password: activationToken, // Storing token in password field for demo simplicity or use a separate table/field
        updatedAt: new Date()
      }).where(eq(users.id, existing.id));
    } else {
      // create new pending user
      await db.insert(users).values({
        email: input.email,
        username: input.email.split('@')[0],
        status: 0,
        password: activationToken, // Storing token temporarily
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Log the activation link
    const link = `http://localhost:5173/auth/activate?token=${activationToken}&email=${encodeURIComponent(input.email)}`;
    console.log('\n\n==================================================');
    console.log('ACCOUNT ACTIVATION LINK:');
    console.log(link);
    console.log('==================================================\n\n');

    return { success: true };
  });

export const activate = os
  .input(z.object({
    email: z.string().email(),
    token: z.string(),
    password: z.string().min(6)
  }))
  .output(z.object({
    user: z.object({
      id: z.string(),
      email: z.string().nullable(),
      name: z.string().nullable(),
      username: z.string().nullable(),
    }).nullable(),
    token: z.string()
  }))
  .handler(async ({ input, context }: { input: any, context: any }) => {
    const db = context.db;
    const [user] = await db.select().from(users).where(eq(users.email, input.email));

    if (!user) {
      throw new ORPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Verify token (stored in password field for this flow)
    if (user.password !== input.token && user.status !== 1) {
      throw new ORPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid or expired activation token',
      });
    }

    const salt = crypto.randomUUID();
    const hashedPassword = await hashPassword(input.password, salt);

    await db.update(users).set({
      status: 1,
      password: hashedPassword,
      salt: salt,
      updatedAt: new Date()
    }).where(eq(users.id, user.id));

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.nickname,
        username: user.username
      },
      token: 'mock-jwt-token-' + user.id
    };
  });
