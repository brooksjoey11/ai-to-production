// src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../server/routers'; // adjust path as needed

export const trpc = createTRPCReact<AppRouter>();
