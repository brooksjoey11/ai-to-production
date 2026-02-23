import { initTRPC } from '@trpc/server';
import { getSession } from 'next-auth/react';

const t = initTRPC.create();

// Middleware for authentication
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return next({ ctx: { ...ctx, user: session.user } });
});

// tRPC router definition with middleware
export const appRouter = t.router({
  // Define your procedures here
}).middleware(isAuthenticated);

// Export type definition of API
export type AppRouter = typeof appRouter;