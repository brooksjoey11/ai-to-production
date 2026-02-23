// server/src/routers/index.ts

import { createRouter } from '@trpc/server';
import { z } from 'zod';

// Example router
export const appRouter = createRouter()
  .query('getData', {
    input: z.string(),
    resolve({ input }) {
      return { data: `Data for ${input}` };
    },
  });

// Export type definition of API
export type AppRouter = typeof appRouter;
