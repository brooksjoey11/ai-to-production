import { createRouter } from '@trpc/server';
import { z } from 'zod';

// tRPC router for authentication
export const authRouter = createRouter()
  .mutation('register', {  // Register a new user
    input: z.object({
      username: z.string(),
      password: z.string(),
    }),
    resolve: async ({ input }) => {
      // Logic for registering a user
      return { success: true, message: 'User registered successfully.' };
    },
  })
  .mutation('login', {  // Login existing user
    input: z.object({
      username: z.string(),
      password: z.string(),
    }),
    resolve: async ({ input }) => {
      // Logic for logging in a user
      return { success: true, message: 'User logged in successfully.' };
    },
  });