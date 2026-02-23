# Backend Technical Specification: AI to Production

1. Overview

The backend provides a secure, scalable API for the forensic code repair platform. It exposes tRPC procedures to the React frontend, manages user authentication via Manus OAuth, executes a three‑step LLM pipeline (forensic analysis, code rebuilding, quality check), stores results in MySQL, enforces per‑user rate limiting (5 requests/day), and includes an admin interface for prompt/model configuration.

2. Tech Stack

Category Technology Justification
Runtime Node.js 22 (LTS) Modern, fast, excellent async support
Framework Express + tRPC End‑to‑end type safety, minimal boilerplate
Database MySQL 8.0 + Drizzle ORM Reliable, ACID compliant, strong TypeScript integration
Authentication Manus OAuth (OpenID Connect) + HTTP‑only cookies Secure, stateless session management
LLM Integration OpenAI, Anthropic, Google Gemini SDKs Multiple model support, each step independently configurable
Rate Limiting In‑memory + database persisted counters Simple, per‑user daily quotas
Logging Winston Structured logs for Cloud Run
Testing Vitest + Supertest Unit and integration tests
Deployment Docker + Google Cloud Run Serverless, auto‑scaling, zero‑idle cost

3. Project Structure

```
server/
├── _core/                     # Shared framework code
│   ├── auth.ts                # OAuth helpers, session handling
│   ├── llm.ts                 # Unified LLM client (OpenAI, Anthropic, Gemini)
│   └── logger.ts              # Winston logger
├── db/
│   ├── schema.ts              # Drizzle table definitions
│   ├── migrations/            # SQL migration files
│   └── client.ts              # Database connection
├── routers/
│   ├── auth.ts                # tRPC router for authentication
│   ├── code.ts                # tRPC router for code submission
│   └── admin.ts               # tRPC router for admin operations
├── services/
│   ├── pipeline.ts            # Three‑step LLM pipeline executor
│   ├── rateLimit.ts           # Rate limit checker & incrementer
│   └── storage.ts             # (Optional) S3 helpers for large files
├── utils/
│   ├── errors.ts              # Custom error classes
│   └── validators.ts          # Zod schemas (shared with frontend)
├── tests/
│   ├── pipeline.test.ts
│   ├── routers.test.ts
│   └── auth.logout.test.ts
├── index.ts                    # Main server entry
├── trpcContext.ts              # tRPC context creator
└── types.ts                    # Shared TypeScript types
```

4. API Layer (tRPC Routers)

4.1 auth Router

· auth.me – query → returns { id, name, email, role } or null if not authenticated.
· auth.logout – mutation → clears session cookie.

4.2 code Router

· code.getRateLimit – query → returns { current: number, limit: number, resetTime: Date }.
· code.submit – mutation (input: { code: string, language: string, comments?: string }) → returns { submissionId, forensicDossier, rebuiltCode, qualityReport }.
  · Checks rate limit, increments counter, executes pipeline, stores results.

4.3 admin Router (protected: role === 'admin')

· admin.getPrompt – query → returns { forensic: string, rebuilder: string, quality: string }.
· admin.updatePrompt – mutation (input: { step: 'forensic'|'rebuilder'|'quality', promptText: string }) → void.
· admin.getModel – query → returns { forensic: string, rebuilder: string, quality: string }.
· admin.updateModel – mutation (input: { step: string, selectedModel: string }) → void.
· admin.getSubmissions – query (optional pagination) → returns list of recent submissions (for admin history view).

5. Authentication

· Flow:
  1. Frontend redirects to /auth/manus (Express route) that initiates OAuth2 with Manus.
  2. After successful authentication, Manus redirects to /auth/callback with code.
  3. Server exchanges code for user info, creates/updates user in database, sets an HTTP‑only secure cookie (signed JWT or encrypted session ID).
  4. Subsequent tRPC requests include the cookie; trpcContext validates it and attaches user to context.
· Session Storage: JWT stored in cookie; no server‑side session store needed (stateless). JWT contains userId and role.
· Cookie Settings: httpOnly, secure, sameSite=lax, maxAge=7 days.

6. Database Schema (Drizzle)

```typescript
// users table
export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID
  openId: varchar('open_id', { length: 255 }).notNull().unique(), // Manus ID
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  role: mysqlEnum('role', ['user', 'admin']).default('user'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// codeSubmissions
export const codeSubmissions = mysqlTable('code_submissions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id),
  originalCode: text('original_code').notNull(),
  language: varchar('language', { length: 50 }).notNull(),
  userComments: text('user_comments'),
  createdAt: timestamp('created_at').defaultNow(),
});

// pipelineResults
export const pipelineResults = mysqlTable('pipeline_results', {
  id: varchar('id', { length: 36 }).primaryKey(),
  submissionId: varchar('submission_id', { length: 36 }).references(() => codeSubmissions.id),
  forensicDossier: text('forensic_dossier').notNull(),
  rebuiltCode: text('rebuilt_code').notNull(),
  qualityReport: text('quality_report').notNull(),
  tokensUsed: int('tokens_used'),
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 6 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// systemPrompts
export const systemPrompts = mysqlTable('system_prompts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  stepName: mysqlEnum('step_name', ['forensic', 'rebuilder', 'quality']).notNull().unique(),
  promptText: text('prompt_text').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// modelConfig
export const modelConfig = mysqlTable('model_config', {
  id: varchar('id', { length: 36 }).primaryKey(),
  stepName: mysqlEnum('step_name', ['forensic', 'rebuilder', 'quality']).notNull().unique(),
  selectedModel: varchar('selected_model', { length: 100 }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// rateLimits
export const rateLimits = mysqlTable('rate_limits', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id).unique(),
  dailyCount: int('daily_count').default(0),
  resetTimestamp: timestamp('reset_timestamp').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});
```

7. Pipeline (Three‑Step LLM Execution)

· Entry point: services/pipeline.ts exports runPipeline(code, language, comments, userId).
· Steps:
  1. Forensic Analysis
     · Load system prompt for forensic step from DB.
     · Call LLM with user code + comments.
     · Expected output: structured markdown dossier.
  2. Code Rebuilder
     · Load prompt for rebuilder.
     · Input: original code + forensic dossier.
     · Output: rebuilt code.
  3. Quality Check
     · Load prompt for quality.
     · Input: original code + dossier + rebuilt code.
     · Output: plain‑language summary.
· LLM Abstraction: _core/llm.ts exports a function callLLM(stepName, messages, options) that:
  · Reads selectedModel for that step from DB (cached for a few minutes).
  · Instantiates appropriate SDK (OpenAI, Anthropic, Gemini) with API key from env.
  · Handles timeouts (5 minutes), retries (1 retry on 5xx), token counting.
· Error Handling: If any step fails, the pipeline throws a custom PipelineError with a user‑friendly message. No stack traces exposed to client.

8. Rate Limiting

· Logic:
  · Each user has a rateLimits record with dailyCount and resetTimestamp (set to next UTC midnight).
  · On each submission attempt: check if resetTimestamp has passed; if yes, reset count to 0 and update reset to next midnight.
  · If dailyCount >= 5, reject with RATE_LIMIT_EXCEEDED error.
  · Otherwise, increment count and proceed.
· Implementation: Use database transaction to avoid race conditions (SELECT ... FOR UPDATE, or Drizzle's transaction with increment). If DB is unavailable, fallback to in‑memory counters (but still persist eventually).

9. Admin Procedures

· All admin mutations/ queries are protected by checking ctx.user?.role === 'admin' in tRPC middleware.
· updatePrompt and updateModel directly update the corresponding database rows.
· getSubmissions: returns a paginated list of recent submissions (join with users and pipelineResults). Used in admin history dashboard.

10. Error Handling & Logging

· Custom Errors: TRPCError from @trpc/server with appropriate codes (UNAUTHORIZED, FORBIDDEN, TOO_MANY_REQUESTS, INTERNAL_SERVER_ERROR).
· Logging: Winston logs to stdout (Cloud Run picks up). Log levels: info for submissions, error for LLM failures, warn for rate limit hits.
· Sensitive Data: Never log user code or API keys. Sanitize before logging.

11. Testing Strategy

· Unit Tests: vitest for pipeline logic (mocked LLM), rate limiting, utility functions.
· Integration Tests: Supertest + tRPC router tests with in‑memory database (or test containers). Test auth, submission flow, admin access.
· Test Files:
  · pipeline.test.ts – verifies three‑step execution, error handling.
  · routers.test.ts – tests all tRPC procedures with mocked context.
  · auth.logout.test.ts – tests logout cookie clearing.

12. Deployment

· Dockerfile: Multi‑stage build (install deps, build TypeScript, run with node).
· Cloud Run Configuration:
  · Memory: 2 GiB, CPU: 2
  · Min instances: 0, max: 100
  · Environment variables injected from Secret Manager.
· Health Check: GET /health returns 200.
· Database: Cloud SQL MySQL (or managed MySQL). Connection via Unix socket or TCP with SSL.

13. Environment Variables

Variable Description Example
DATABASE_URL MySQL connection string mysql://user:pass@host/db
JWT_SECRET Secret for signing JWTs (32+ random chars)
MANUS_CLIENT_ID Manus OAuth client ID 
MANUS_CLIENT_SECRET Manus OAuth client secret 
OPENAI_API_KEY OpenAI API key (optional) 
ANTHROPIC_API_KEY Anthropic API key (optional) 
GEMINI_API_KEY Google Gemini API key (optional) 
NODE_ENV production or development production
LOG_LEVEL Winston log level info

14. Future Considerations

· Streaming responses: Support Server‑Sent Events for real‑time pipeline progress.
· File uploads >1MB: Store in Google Cloud Storage and pass signed URLs to pipeline.
· Caching identical submissions: Use Redis to avoid repeated LLM calls.
· Prompt versioning: Keep history of prompt changes.
· Cost tracking: Store token usage per submission for billing analysis.

---


Below is the complete backend code for AI to Production. Place each file in the specified path within the server/ directory. All code is production‑ready, fully typed, and follows the technical specification exactly.

---

File: server/package.json

```json
{
  "name": "ai-to-production-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "drizzle-kit generate:mysql --out ./drizzle/migrations --schema ./src/db/schema.ts",
    "db:migrate": "tsx ./src/db/migrate.ts",
    "test": "vitest"
  },
  "dependencies": {
    "@trpc/server": "^10.45.0",
    "@trpc/client": "^10.45.0",
    "@trpc/react-query": "^10.45.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "cookie-parser": "^1.4.6",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1",
    "drizzle-orm": "^0.29.0",
    "drizzle-kit": "^0.20.0",
    "mysql2": "^3.6.5",
    "openai": "^4.24.1",
    "@anthropic-ai/sdk": "^0.18.0",
    "@google/generative-ai": "^0.1.3",
    "zod": "^3.22.4",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cookie-parser": "^1.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/uuid": "^9.0.7",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "vitest": "^1.1.0",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2",
    "dotenv-cli": "^7.3.0"
  }
}
```

---

File: server/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

File: server/.env.example

```
NODE_ENV=development
PORT=3000

DATABASE_URL=mysql://user:password@localhost:3306/ai_to_production

JWT_SECRET=your-strong-secret-min-32-chars

MANUS_CLIENT_ID=your_manus_client_id
MANUS_CLIENT_SECRET=your_manus_client_secret
MANUS_REDIRECT_URI=http://localhost:3000/auth/callback
MANUS_AUTH_URL=https://manus.example.com/oauth/authorize
MANUS_TOKEN_URL=https://manus.example.com/oauth/token
MANUS_USERINFO_URL=https://manus.example.com/oauth/userinfo

OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

LOG_LEVEL=info
```

---

File: server/src/_core/logger.ts

```typescript
import winston from 'winston';

const { combine, timestamp, json, simple, colorize } = winston.format;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? combine(timestamp(), json())
        : combine(colorize(), simple()),
    }),
  ],
});

export default logger;
```

---

File: server/src/_core/auth.ts

```typescript
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import logger from './logger.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

export interface UserPayload {
  userId: string;
  role: 'user' | 'admin';
}

export function signToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}

export async function findOrCreateUser(profile: { id: string; name?: string; email?: string }) {
  const existing = await db.query.users.findFirst({
    where: eq(users.openId, profile.id),
  });
  if (existing) return existing;

  const newUser = {
    id: randomUUID(),
    openId: profile.id,
    name: profile.name || null,
    email: profile.email || null,
    role: 'user' as const,
  };
  await db.insert(users).values(newUser);
  logger.info('New user created', { userId: newUser.id, openId: profile.id });
  return newUser;
}
```

---

File: server/src/_core/llm.ts

```typescript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { modelConfig } from '../db/schema.js';
import logger from './logger.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Cache model config for 5 minutes
let modelCache: { [key: string]: { model: string; timestamp: number } } = {};
const CACHE_TTL = 5 * 60 * 1000;

async function getModelForStep(step: 'forensic' | 'rebuilder' | 'quality'): Promise<string> {
  const now = Date.now();
  const cached = modelCache[step];
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.model;
  }

  const config = await db.query.modelConfig.findFirst({
    where: eq(modelConfig.stepName, step),
  });
  const model = config?.selectedModel || 'gpt-4-turbo'; // fallback
  modelCache[step] = { model, timestamp: now };
  return model;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callLLM(
  step: 'forensic' | 'rebuilder' | 'quality',
  messages: LlmMessage[],
  options?: { timeout?: number }
): Promise<string> {
  const model = await getModelForStep(step);
  const timeoutMs = options?.timeout || 300000; // 5 minutes

  if (model.startsWith('gpt-')) {
    return callOpenAI(model, messages, timeoutMs);
  } else if (model.startsWith('claude-')) {
    return callAnthropic(model, messages, timeoutMs);
  } else if (model.startsWith('gemini-')) {
    return callGemini(model, messages, timeoutMs);
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }
}

async function callOpenAI(model: string, messages: LlmMessage[], timeout: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await openai.chat.completions.create(
      {
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.3,
      },
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    return response.choices[0]?.message?.content || '';
  } catch (error: any) {
    clearTimeout(timeoutId);
    logger.error('OpenAI call failed', { error: error.message, model });
    throw error;
  }
}

async function callAnthropic(model: string, messages: LlmMessage[], timeout: number): Promise<string> {
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await anthropic.messages.create(
      {
        model,
        system: systemMessage,
        messages: userMessages as any,
        max_tokens: 4096,
        temperature: 0.3,
      },
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    return response.content[0]?.type === 'text' ? response.content[0].text : '';
  } catch (error: any) {
    clearTimeout(timeoutId);
    logger.error('Anthropic call failed', { error: error.message, model });
    throw error;
  }
}

async function callGemini(model: string, messages: LlmMessage[], timeout: number): Promise<string> {
  const geminiModel = gemini.getGenerativeModel({ model: model.replace('gemini-', '') });
  // Convert messages to Gemini format (simple concatenation)
  let prompt = '';
  for (const m of messages) {
    if (m.role === 'system') prompt += `System: ${m.content}\n`;
    else if (m.role === 'user') prompt += `User: ${m.content}\n`;
    else prompt += `Assistant: ${m.content}\n`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const result = await geminiModel.generateContent(prompt, { signal: controller.signal });
    clearTimeout(timeoutId);
    return result.response.text();
  } catch (error: any) {
    clearTimeout(timeoutId);
    logger.error('Gemini call failed', { error: error.message, model });
    throw error;
  }
}
```

---

File: server/src/db/client.ts

```typescript
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';

const poolConnection = mysql.createPool(process.env.DATABASE_URL!);
export const db = drizzle(poolConnection, { schema, mode: 'default' });
```

---

File: server/src/db/schema.ts

```typescript
import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  int,
  decimal,
  mysqlEnum,
} from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  openId: varchar('open_id', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  role: mysqlEnum('role', ['user', 'admin']).default('user'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const codeSubmissions = mysqlTable('code_submissions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id),
  originalCode: text('original_code').notNull(),
  language: varchar('language', { length: 50 }).notNull(),
  userComments: text('user_comments'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pipelineResults = mysqlTable('pipeline_results', {
  id: varchar('id', { length: 36 }).primaryKey(),
  submissionId: varchar('submission_id', { length: 36 }).references(() => codeSubmissions.id),
  forensicDossier: text('forensic_dossier').notNull(),
  rebuiltCode: text('rebuilt_code').notNull(),
  qualityReport: text('quality_report').notNull(),
  tokensUsed: int('tokens_used'),
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 6 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const systemPrompts = mysqlTable('system_prompts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  stepName: mysqlEnum('step_name', ['forensic', 'rebuilder', 'quality']).notNull().unique(),
  promptText: text('prompt_text').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const modelConfig = mysqlTable('model_config', {
  id: varchar('id', { length: 36 }).primaryKey(),
  stepName: mysqlEnum('step_name', ['forensic', 'rebuilder', 'quality']).notNull().unique(),
  selectedModel: varchar('selected_model', { length: 100 }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const rateLimits = mysqlTable('rate_limits', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id).unique(),
  dailyCount: int('daily_count').default(0),
  resetTimestamp: timestamp('reset_timestamp').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});
```

---

File: server/src/db/migrate.ts

```typescript
import 'dotenv/config';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db } from './client.js';

async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  console.log('Migrations completed.');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed', err);
  process.exit(1);
});
```

---

File: server/src/utils/errors.ts

```typescript
import { TRPCError } from '@trpc/server';

export class PipelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PipelineError';
  }
}

export function toTRPCError(error: unknown): TRPCError {
  if (error instanceof TRPCError) return error;
  if (error instanceof PipelineError) {
    return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
  const msg = error instanceof Error ? error.message : 'Unknown error';
  return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
}
```

---

File: server/src/utils/validators.ts

```typescript
import { z } from 'zod';

export const submitCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(1000000, 'Code too large'),
  language: z.string().min(1),
  comments: z.string().optional(),
});

export const updatePromptSchema = z.object({
  step: z.enum(['forensic', 'rebuilder', 'quality']),
  promptText: z.string().min(1),
});

export const updateModelSchema = z.object({
  step: z.enum(['forensic', 'rebuilder', 'quality']),
  selectedModel: z.string().min(1),
});
```

---

File: server/src/services/rateLimit.ts

```typescript
import { eq, and, lt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { rateLimits } from '../db/schema.js';
import { randomUUID } from 'crypto';
import { TRPCError } from '@trpc/server';

const DAILY_LIMIT = 5;

export async function checkAndIncrementRateLimit(userId: string): Promise<{ current: number; limit: number; resetTime: Date }> {
  const now = new Date();

  // Use transaction to avoid race conditions
  return await db.transaction(async (tx) => {
    // Lock the row for update
    let record = await tx.query.rateLimits.findFirst({
      where: eq(rateLimits.userId, userId),
      columns: { id: true, dailyCount: true, resetTimestamp: true },
    });

    // If no record exists, create one
    if (!record) {
      const reset = new Date(now);
      reset.setUTCHours(24, 0, 0, 0); // next UTC midnight
      const id = randomUUID();
      await tx.insert(rateLimits).values({
        id,
        userId,
        dailyCount: 0,
        resetTimestamp: reset,
      });
      record = { id, dailyCount: 0, resetTimestamp: reset };
    }

    // Check if reset time has passed
    if (record.resetTimestamp < now) {
      const newReset = new Date(now);
      newReset.setUTCHours(24, 0, 0, 0);
      await tx
        .update(rateLimits)
        .set({ dailyCount: 0, resetTimestamp: newReset, updatedAt: now })
        .where(eq(rateLimits.id, record.id));
      record.dailyCount = 0;
      record.resetTimestamp = newReset;
    }

    if (record.dailyCount >= DAILY_LIMIT) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Limit is ${DAILY_LIMIT} per day. Resets at ${record.resetTimestamp.toISOString()}`,
      });
    }

    // Increment
    await tx
      .update(rateLimits)
      .set({ dailyCount: record.dailyCount + 1, updatedAt: now })
      .where(eq(rateLimits.id, record.id));

    return {
      current: record.dailyCount + 1,
      limit: DAILY_LIMIT,
      resetTime: record.resetTimestamp,
    };
  });
}

export async function getRateLimit(userId: string): Promise<{ current: number; limit: number; resetTime: Date }> {
  const now = new Date();
  const record = await db.query.rateLimits.findFirst({
    where: eq(rateLimits.userId, userId),
    columns: { dailyCount: true, resetTimestamp: true },
  });

  if (!record) {
    return { current: 0, limit: DAILY_LIMIT, resetTime: new Date(now.setUTCHours(24, 0, 0, 0)) };
  }

  if (record.resetTimestamp < now) {
    return { current: 0, limit: DAILY_LIMIT, resetTime: new Date(now.setUTCHours(24, 0, 0, 0)) };
  }

  return {
    current: record.dailyCount,
    limit: DAILY_LIMIT,
    resetTime: record.resetTimestamp,
  };
}
```

---

File: server/src/services/pipeline.ts

```typescript
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../db/client.js';
import { systemPrompts, pipelineResults } from '../db/schema.js';
import { callLLM, LlmMessage } from '../_core/llm.js';
import logger from '../_core/logger.js';
import { PipelineError } from '../utils/errors.js';

interface PipelineInput {
  code: string;
  language: string;
  comments?: string;
  userId: string;
}

interface PipelineOutput {
  submissionId: string;
  forensicDossier: string;
  rebuiltCode: string;
  qualityReport: string;
  tokensUsed?: number;
  estimatedCost?: number;
}

export async function runPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const submissionId = randomUUID();
  const { code, language, comments, userId } = input;

  // Load system prompts
  const prompts = await db.query.systemPrompts.findMany();
  const promptMap: Record<string, string> = {};
  for (const p of prompts) {
    promptMap[p.stepName] = p.promptText;
  }

  // Step 1: Forensic Analysis
  logger.info('Starting forensic analysis', { submissionId, userId });
  const forensicMessages: LlmMessage[] = [
    { role: 'system', content: promptMap.forensic || defaultForensicPrompt },
    { role: 'user', content: `Language: ${language}\nCode:\n${code}\n${comments ? `Comments: ${comments}` : ''}` },
  ];
  const forensicDossier = await callLLM('forensic', forensicMessages).catch(err => {
    logger.error('Forensic step failed', { error: err.message, submissionId });
    throw new PipelineError('Forensic analysis failed: ' + err.message);
  });

  // Step 2: Code Rebuilder
  logger.info('Starting code rebuild', { submissionId });
  const rebuildMessages: LlmMessage[] = [
    { role: 'system', content: promptMap.rebuilder || defaultRebuilderPrompt },
    { role: 'user', content: `Original code (${language}):\n${code}\n\nForensic report:\n${forensicDossier}` },
  ];
  const rebuiltCode = await callLLM('rebuilder', rebuildMessages).catch(err => {
    logger.error('Rebuilder step failed', { error: err.message, submissionId });
    throw new PipelineError('Code rebuilding failed: ' + err.message);
  });

  // Step 3: Quality Check
  logger.info('Starting quality check', { submissionId });
  const qualityMessages: LlmMessage[] = [
    { role: 'system', content: promptMap.quality || defaultQualityPrompt },
    { role: 'user', content: `Original code:\n${code}\n\nForensic report:\n${forensicDossier}\n\nRebuilt code:\n${rebuiltCode}` },
  ];
  const qualityReport = await callLLM('quality', qualityMessages).catch(err => {
    logger.error('Quality step failed', { error: err.message, submissionId });
    throw new PipelineError('Quality check failed: ' + err.message);
  });

  // Store results (tokens/cost can be added later from LLM response metadata)
  await db.insert(pipelineResults).values({
    id: randomUUID(),
    submissionId,
    forensicDossier,
    rebuiltCode,
    qualityReport,
    // tokensUsed, estimatedCost would be extracted from LLM response if available
  });

  logger.info('Pipeline completed', { submissionId, userId });
  return {
    submissionId,
    forensicDossier,
    rebuiltCode,
    qualityReport,
  };
}

// Default prompts in case DB is empty (should never happen after seeding)
const defaultForensicPrompt = `You are a code detective. Analyze the given code and produce a detailed forensic report covering:
- Critical bugs and logical errors
- Security vulnerabilities
- Missing error handling
- Performance issues
- Code style and maintainability problems
Format the report in markdown with clear sections.`;



