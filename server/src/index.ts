import express from 'express';
import { inferAsyncReturnType, initTRPC } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';

// Create express app
const app = express();
// Middleware to parse JSON
app.use(express.json());

// Create tRPC context
const createContext = ({ req, res }: { req: express.Request; res: express.Response }) => ({ });
const tRPC = initTRPC.context<inferAsyncReturnType<typeof createContext>>().create();

// Define a sample procedure
const appRouter = tRPC.router({
  getUser: tRPC.procedure.input(z.string()).query((opts) => {
    return { id: opts.input, name: 'Bilbo' };
  }),
});

// Create tRPC endpoint
app.use('/trpc', trpcExpress.createExpressMiddleware({
  router: appRouter,
  createContext,
}));

// Start express server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
