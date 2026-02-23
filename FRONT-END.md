# Front-End Technical Specs: AI to Production

1. Overview

The front end of AI to Production is a brutalist, single-page application (SPA) that provides a forensic code repair interface. It translates user input (broken AI-generated code) through a three-step pipeline and presents the results in a clear, industrial-grade dashboard. The front end communicates exclusively with the backend via tRPC, ensuring end-to-end type safety and a seamless developer experience.

---

2. Tech Stack

Category Technology Justification
Framework React 18 + TypeScript Component-based architecture, strong typing, large ecosystem.
Build Tool Vite Fast development server, optimized production builds.
Styling Tailwind CSS Utility-first, matches brutalist aesthetic, rapid UI development.
API Client tRPC (React client) End-to-end typesafe communication with backend; eliminates manual API client.
State Management React Context + React Query (via tRPC) tRPC integrates with React Query for caching, loading states, mutations.
Routing React Router v6 Declarative routing for public pages, protected admin routes.
Form Handling React Hook Form + Zod Performant forms with validation (Zod schemas shared with backend).
Code Editing/Display CodeMirror 6 / react-simple-code-editor Syntax highlighting for code input and rebuilt code output.
Markdown Rendering React Markdown + remark-gfm Render forensic dossier (markdown) with GitHub-flavored markdown.
Icons Lucide React Minimal, consistent icon set.
Testing Vitest + React Testing Library Unit and component testing.

---

3. Project Structure (src/)

```
src/
├── assets/            # Static images, fonts (IBM Plex)
├── components/        # Reusable UI components
│   ├── ui/            # Atomic components: Button, Textarea, Tabs, Card, etc.
│   ├── layout/        # Header, Footer, Container, Grid
│   └── code/          # CodeInput, CodeViewer (with syntax highlighting)
├── features/          # Feature-based modules
│   ├── submission/    # Code submission form, language selector, rate limit banner
│   ├── results/       # Three-tab results view (Dossier, Rebuilt, Quality)
│   ├── admin/         # Admin dashboard (prompt editor, model selector, history)
│   └── auth/          # Login/logout buttons, user context
├── hooks/             # Custom hooks: useRateLimit, useSubmission, useAdmin
├── lib/               # Utilities: tRPC client, date formatting, validators
├── pages/             # Route-level components
│   ├── Home.tsx
│   ├── Admin.tsx
│   └── NotFound.tsx
├── routes/            # Route definitions and protected route wrapper
├── styles/            # Global CSS (Tailwind imports, custom base styles)
├── types/             # TypeScript types shared with backend (via tRPC)
├── App.tsx
├── main.tsx
└── vite-env.d.ts
```

---

4. Component Hierarchy

```
App
├── AuthProvider (tRPC user context)
├── RouterProvider
│   ├── Home (public)
│   │   ├── CodeSubmission
│   │   │   ├── LanguageSelector
│   │   │   ├── FileUpload (drag-drop)
│   │   │   ├── CommentsField (optional)
│   │   │   └── RateLimitDisplay
│   │   └── CodeResults (shown after submission)
│   │       ├── Tabs (ForensicDossier, RebuiltCode, QualityReport)
│   │       │   ├── ForensicDossier (markdown renderer)
│   │       │   ├── RebuiltCode (syntax-highlighted + copy/download)
│   │       │   └── QualityReport (bullet list)
│   │       └── ExportAll button
│   └── Admin (protected)
│       ├── AdminTabs
│       │   ├── PromptEditor (CodeMirror for each step, token counter)
│       │   ├── ModelSelector (dropdown per step)
│       │   └── HistoryTable (mock data)
│       └── SaveButton
└── NotFound
```

---

5. Key Components & Their Specifications

5.1 CodeSubmission

· File: src/features/submission/CodeSubmission.tsx
· Props: none (reads from tRPC context)
· State:
  · code (string) – user pasted code
  · language (enum) – selected from supported list
  · comments (string) – optional context
  · file (File | null) – for drag-drop upload
  · isSubmitting (boolean)
· Data Fetching:
  · useQuery for code.getRateLimit (poll every 60s)
  · useMutation for code.submit
· Behavior:
  · On file drop, read file and set code + auto-detect language from extension.
  · On submit, call code.submit with payload. Redirect to results view (or show inline results).
  · Display rate limit banner with remaining quota; disable submit if limit reached.
· UI: Brutalist textarea with thick border, IBM Plex Mono font, language dropdown styled as geometric select.

5.2 CodeResults

· File: src/features/results/CodeResults.tsx
· Props:
  · submissionId (string) – from URL or state
  · dossier (string) – markdown content
  · rebuiltCode (string)
  · qualityReport (string) – plain text or markdown
· Subcomponents:
  · ForensicDossier: uses ReactMarkdown with remark-gfm.
  · RebuiltCode: uses react-simple-code-editor with language highlighting based on submission language. Includes copy and download buttons.
  · QualityReport: renders as bullet list (split by lines).
· Behavior: Three tabs using accessible Tab component; default active tab is "Rebuilt Code".
· Export: Combine outputs into a single ZIP file using JSZip (optional) or provide individual downloads.

5.3 AdminDashboard

· File: src/features/admin/AdminDashboard.tsx
· Auth: Protected route – checks user.role === 'admin' from tRPC context; redirects if not.
· State:
  · prompts – object with keys forensic, rebuilder, quality
  · models – object with same keys, values are model IDs
  · editingPrompt (string | null) – which prompt is being edited
· Data Fetching:
  · useQuery for admin.getPrompt and admin.getModel
  · useMutation for admin.updatePrompt and admin.updateModel
· UI: Two tabs (Prompts, Models). Prompt editor uses CodeMirror with markdown syntax highlighting and character/token count. Model selector uses dropdown populated from backend list. Save button updates via mutation with optimistic updates.
· History tab: Mock data table showing recent submissions (could be extended later).

5.4 RateLimitDisplay

· File: src/components/RateLimitDisplay.tsx
· Props: current (number), limit (number), resetTime (Date)
· UI: Progress bar or text indicator with color change when approaching limit. Uses IBM Plex Sans bold.

---

6. State Management

· Server State (API data): tRPC + React Query.
  · All queries and mutations are defined in tRPC router; front end calls them via generated hooks.
  · Example: const rateLimit = trpc.code.getRateLimit.useQuery();
· Client State (UI only): React useState / useReducer for form inputs, tab selection, etc.
· Global Client State: React Context for user authentication (derived from tRPC auth.me query). Provides user and refetch to components.

---

7. Routing (React Router v6)

Path Component Protection Description
/ Home Public Code submission + results (inline)
/admin Admin Admin only Prompt/model management
* NotFound Public 404 page

Results may be displayed on the same page after submission (via URL query param or state). Alternatively, a dedicated /results/:id route could be added, but current design implies inline results.

---

8. API Integration (tRPC)

The front end connects to the backend via a tRPC client configured in src/lib/trpc.ts:

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../server/routers'; // path to backend router types

export const trpc = createTRPCReact<AppRouter>();
```

In main.tsx, wrap the app with QueryClientProvider and trpc.Provider, linking to the backend URL (via environment variable).

Example usage in component:

```typescript
const mutation = trpc.code.submit.useMutation({
  onSuccess: (data) => {
    // update local results state or navigate
  },
});
mutation.mutate({ code, language, comments });
```

Type safety: The front end automatically gets full type inference from the backend router – no manual API client generation needed.

---

9. Design System (Brutalist)

· Typography:
  · Headings: IBM Plex Sans, 900 weight, uppercase.
  · Body: IBM Plex Sans, 400/700 weight.
  · Code: IBM Plex Mono, 400 weight.
· Colors:
  · Primary text: #000000 on #FFFFFF background.
  · Borders: #000000 solid, 4px to 8px thickness.
  · Accent (minimal): #444444 for hover states, #cccccc for disabled.
· Layout:
  · Asymmetric grid with wide gutters.
  · Containers have thick borders and no border-radius.
  · Abundant negative space (whitespace).
· Components:
  · Buttons: rectangular, solid black background with white text, thick border on hover.
  · Inputs: no background, black border, monospace font for code areas.
· Icons: Lucide icons, thin strokes, black.

All styles are implemented with Tailwind CSS using a custom config extending the default theme.

---

10. Environment Configuration

Environment variables (.env):

```
VITE_API_URL=https://api.example.com/trpc   # tRPC endpoint
VITE_MOCK_MODE=false                         # optional mock for development
VITE_MAX_UPLOAD_SIZE=1048576                  # 1MB in bytes
```

---

11. Build & Deployment

· Build command: npm run build (Vite generates static files in dist/).
· Deployment: Static hosting (e.g., Vercel, Netlify, or served via Cloud Run as part of the container).
· CI/CD: GitHub Actions run tests and linting on PR, then deploy on merge to main.

---

12. Testing Strategy

· Unit Tests (Vitest): Test utility functions, hooks (useRateLimit).
· Component Tests (React Testing Library): Test key components like CodeSubmission (form validation, submission flow), CodeResults (tab switching, rendering), AdminDashboard (permissions).
· Integration Tests: Mock tRPC server using msw to test full submission flow.
· E2E (optional): Playwright for critical user journeys.

---

13. Performance Considerations

· Code splitting: React.lazy for Admin route (since only admins use it).
· Bundle optimization: Vite's default optimizations, plus manual chunks for large dependencies (CodeMirror, ReactMarkdown).
· Image optimization: All assets compressed; fonts loaded with font-display: swap.
· Rate limit polling: Use incremental backoff or websocket for real-time updates (optional).

---

14. Accessibility (a11y)

· Semantic HTML (buttons, headings, etc.).
· ARIA labels for tabs, code editors, and interactive elements.
· Focus management: visible focus indicators (thick black outline).
· Color contrast meets WCAG AA (black on white).
· Keyboard navigable: all interactions operable via keyboard.

---

15. Future Extensibility

· Support for multiple result views (e.g., diff view between original and rebuilt).
· Real-time pipeline progress via Server-Sent Events or WebSockets.
· User history dashboard (beyond admin).

---

This specification serves as the blueprint for implementing the front end of AI to Production. All components are isolated, typed, and integrated with the backend via tRPC, ensuring a robust and maintainable codebase.








```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from './lib/trpc';
import App from './App';
import './styles/index.css';

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL || '/trpc',
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include', // required for cookies
        });
      },
    }),
  ],
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>
);
```

```typescript
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_MAX_UPLOAD_SIZE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

```typescript
// src/App.tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

function App() {
  return <RouterProvider router={router} />;
}

export default App;
```

```typescript
// src/routes/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import Home from '../pages/Home';
import Admin from '../pages/Admin';
import NotFound from '../pages/NotFound';
import ProtectedRoute from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
    errorElement: <NotFound />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRole="admin">
        <Admin />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
```

```typescript
// src/routes/ProtectedRoute.tsx
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'user' | 'admin';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole === 'admin' && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

```typescript
// src/pages/Home.tsx
import { useState } from 'react';
import CodeSubmission from '../features/submission/CodeSubmission';
import CodeResults from '../features/results/CodeResults';
import { trpc } from '../lib/trpc';

export default function Home() {
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [results, setResults] = useState<{
    forensicDossier: string;
    rebuiltCode: string;
    qualityReport: string;
  } | null>(null);

  const handleSubmissionSuccess = (
    id: string,
    data: { forensicDossier: string; rebuiltCode: string; qualityReport: string }
  ) => {
    setSubmissionId(id);
    setResults(data);
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b-4 border-black py-8">
        <div className="container mx-auto px-4 md:px-8">
          <h1 className="font-sans text-6xl md:text-7xl font-black uppercase tracking-tighter">
            AI TO PRODUCTION
          </h1>
          <p className="font-sans text-xl text-gray-600 mt-2">Forensic Code Analysis Platform</p>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-12">
        {!results ? (
          <CodeSubmission onSuccess={handleSubmissionSuccess} />
        ) : (
          <div>
            <CodeResults
              submissionId={submissionId!}
              forensicDossier={results.forensicDossier}
              rebuiltCode={results.rebuiltCode}
              qualityReport={results.qualityReport}
            />
            <button
              onClick={() => {
                setSubmissionId(null);
                setResults(null);
              }}
              className="mt-8 px-8 py-4 bg-black text-white font-bold uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-colors"
            >
              New Analysis
            </button>
          </div>
        )}
      </main>

      <footer className="border-t-4 border-black mt-20 py-8">
        <div className="container mx-auto px-4 md:px-8 text-sm text-gray-600">
          © 2026 AI to Production. Built for reliability.
        </div>
      </footer>
    </div>
  );
}
```

```typescript
// src/pages/Admin.tsx
import AdminDashboard from '../features/admin/AdminDashboard';

export default function Admin() {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b-4 border-black py-8">
        <div className="container mx-auto px-4 md:px-8">
          <h1 className="font-sans text-5xl font-black uppercase tracking-tighter">
            ADMIN COMMAND CENTER
          </h1>
        </div>
      </header>
      <main className="container mx-auto px-4 md:px-8 py-12">
        <AdminDashboard />
      </main>
    </div>
  );
}
```

```typescript
// src/pages/NotFound.tsx
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-sans text-9xl font-black">404</h1>
        <p className="font-sans text-xl mt-4">Page not found</p>
        <Link
          to="/"
          className="inline-block mt-8 px-8 py-4 bg-black text-white font-bold uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
```

```typescript
// src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../server/routers'; // adjust path as needed

export const trpc = createTRPCReact<AppRouter>();
```

```typescript
// src/lib/utils.ts
export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const detectLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    cs: 'csharp',
    php: 'php',
  };
  return map[ext || ''] || 'plaintext';
};
```

```typescript
// src/hooks/useRateLimit.ts
import { trpc } from '../lib/trpc';

export function useRateLimit() {
  const { data, refetch } = trpc.code.getRateLimit.useQuery(undefined, {
    refetchInterval: 60000, // poll every minute
  });

  return {
    current: data?.current ?? 0,
    limit: data?.limit ?? 5,
    resetTime: data?.resetTime ? new Date(data.resetTime) : undefined,
    refetch,
  };
}
```

```typescript
// src/features/submission/CodeSubmission.tsx
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { trpc } from '../../lib/trpc';
import { detectLanguageFromFilename } from '../../lib/utils';
import LanguageSelector from './LanguageSelector';
import CommentsField from './CommentsField';
import RateLimitDisplay from '../../components/RateLimitDisplay';
import { useRateLimit } from '../../hooks/useRateLimit';

const MAX_SIZE = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE) || 1048576; // 1MB default

interface CodeSubmissionProps {
  onSuccess: (submissionId: string, results: { forensicDossier: string; rebuiltCode: string; qualityReport: string }) => void;
}

export default function CodeSubmission({ onSuccess }: CodeSubmissionProps) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [comments, setComments] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const { current, limit, resetTime } = useRateLimit();
  const submitMutation = trpc.code.submit.useMutation({
    onSuccess: (data) => {
      onSuccess(data.submissionId, {
        forensicDossier: data.forensicDossier,
        rebuiltCode: data.rebuiltCode,
        qualityReport: data.qualityReport,
      });
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > MAX_SIZE) {
        setFileError(`File too large. Max size: ${MAX_SIZE / 1024 / 1024}MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCode(content);
        const detected = detectLanguageFromFilename(file.name);
        setLanguage(detected);
        setFile(file);
        setFileError(null);
      };
      reader.readAsText(file);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'text/*': ['.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.cpp', '.c', '.cs', '.php'],
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    if (current >= limit) {
      alert('Rate limit exceeded. Please try again later.');
      return;
    }
    submitMutation.mutate({ code, language, comments });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <RateLimitDisplay current={current} limit={limit} resetTime={resetTime} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <label className="block font-sans text-xs font-bold uppercase tracking-widest mb-2">
            Paste Source Code
          </label>
          <div
            {...getRootProps()}
            className={`border-4 border-black p-4 bg-white cursor-pointer transition-colors ${
              isDragActive ? 'bg-gray-100' : ''
            }`}
          >
            <input {...getInputProps()} />
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your AI-generated code here, or drag & drop a file..."
              className="w-full h-96 font-mono text-sm bg-transparent border-none outline-none resize-none"
              disabled={submitMutation.isLoading}
            />
          </div>
          {file && <p className="mt-2 text-sm text-gray-600">File: {file.name}</p>}
          {fileError && <p className="mt-2 text-sm text-red-600">{fileError}</p>}
        </div>

        <div className="space-y-6">
          <LanguageSelector value={language} onChange={setLanguage} />
          <CommentsField value={comments} onChange={setComments} />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitMutation.isLoading || !code.trim() || current >= limit}
          className="px-12 py-4 bg-black text-white font-bold uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitMutation.isLoading ? 'Processing...' : 'Fix My Code'}
        </button>
      </div>
    </form>
  );
}
```

```typescript
// src/features/submission/LanguageSelector.tsx
interface LanguageSelectorProps {
  value: string;
  onChange: (lang: string) => void;
}

const languages = [
  'plaintext',
  'python',
  'javascript',
  'typescript',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
];

export default function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <div>
      <label className="block font-sans text-xs font-bold uppercase tracking-widest mb-2">
        Language
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-4 border-black p-3 font-mono text-sm bg-white focus:outline-none"
      >
        {languages.map((lang) => (
          <option key={lang} value={lang}>
            {lang.charAt(0).toUpperCase() + lang.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
```

```typescript
// src/features/submission/CommentsField.tsx
interface CommentsFieldProps {
  value: string;
  onChange: (val: string) => void;
}

export default function CommentsField({ value, onChange }: CommentsFieldProps) {
  return (
    <div>
      <label className="block font-sans text-xs font-bold uppercase tracking-widest mb-2">
        Additional Context (optional)
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add any notes for the detective..."
        className="w-full border-4 border-black p-3 font-mono text-sm bg-white h-32 resize-none"
      />
    </div>
  );
}
```

```typescript
// src/components/RateLimitDisplay.tsx
interface RateLimitDisplayProps {
  current: number;
  limit: number;
  resetTime?: Date;
}

export default function RateLimitDisplay({ current, limit, resetTime }: RateLimitDisplayProps) {
  const remaining = limit - current;
  const isLow = remaining <= 1;

  return (
    <div className="border-4 border-black p-4 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="font-sans text-sm font-bold uppercase tracking-widest">
          Daily Remaining: {remaining} / {limit}
        </span>
        {resetTime && (
          <span className="font-mono text-xs text-gray-600">
            Resets at {resetTime.toLocaleTimeString()}
          </span>
        )}
      </div>
      {isLow && (
        <p className="mt-2 font-sans text-sm text-red-600 font-bold">
          ⚠️ Low quota. You have {remaining} fix{remaining !== 1 ? 'es' : ''} left today.
        </p>
      )}
    </div>
  );
}
```

```typescript
// src/features/results/CodeResults.tsx
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import ForensicDossier from './ForensicDossier';
import RebuiltCode from './RebuiltCode';
import QualityReport from './QualityReport';
import ExportAll from './ExportAll';

interface CodeResultsProps {
  submissionId: string;
  forensicDossier: string;
  rebuiltCode: string;
  qualityReport: string;
}

export default function CodeResults({
  submissionId,
  forensicDossier,
  rebuiltCode,
  qualityReport,
}: CodeResultsProps) {
  const [activeTab, setActiveTab] = useState('rebuild');

  return (
    <div className="space-y-8">
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
        <Tabs.List className="grid grid-cols-3 border-4 border-black">
          <Tabs.Trigger
            value="forensic"
            className="py-4 font-sans font-bold uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white border-r-4 border-black last:border-r-0"
          >
            Forensic Dossier
          </Tabs.Trigger>
          <Tabs.Trigger
            value="rebuild"
            className="py-4 font-sans font-bold uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white border-r-4 border-black last:border-r-0"
          >
            Rebuilt Code
          </Tabs.Trigger>
          <Tabs.Trigger
            value="quality"
            className="py-4 font-sans font-bold uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white"
          >
            Quality Report
          </Tabs.Trigger>
        </Tabs.List>

        <div className="mt-8">
          <AnimatePresence mode="wait">
            {activeTab === 'forensic' && (
              <motion.div
                key="forensic"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ForensicDossier content={forensicDossier} />
              </motion.div>
            )}
            {activeTab === 'rebuild' && (
              <motion.div
                key="rebuild"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <RebuiltCode code={rebuiltCode} language="auto" />
              </motion.div>
            )}
            {activeTab === 'quality' && (
              <motion.div
                key="quality"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <QualityReport content={qualityReport} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Tabs.Root>

      <ExportAll
        forensicDossier={forensicDossier}
        rebuiltCode={rebuiltCode}
        qualityReport={qualityReport}
      />
    </div>
  );
}
```

```typescript
// src/features/results/ForensicDossier.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy } from 'lucide-react';
import { useState } from 'react';

interface ForensicDossierProps {
  content: string;
}

export default function ForensicDossier({ content }: ForensicDossierProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-4 border-black p-6 bg-white">
      <div className="flex justify-end mb-4">
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
        >
          <Copy size={16} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="prose prose-sm max-w-none font-mono text-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
```

```typescript
// src/features/results/RebuiltCode.tsx
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-php';
import 'prismjs/themes/prism.css'; // optional, but we'll style manually
import { Copy, Download } from 'lucide-react';
import { useState } from 'react';

interface RebuiltCodeProps {
  code: string;
  language: string; // 'auto' or specific
}

const languageMap: Record<string, any> = {
  python: languages.python,
  javascript: languages.javascript,
  typescript: languages.typescript,
  java: languages.java,
  c: languages.c,
  cpp: languages.cpp,
  csharp: languages.csharp,
  go: languages.go,
  rust: languages.rust,
  ruby: languages.ruby,
  php: languages.php,
};

export default function RebuiltCode({ code, language }: RebuiltCodeProps) {
  const [copied, setCopied] = useState(false);
  const lang = language === 'auto' ? 'plaintext' : languageMap[language] ? language : 'plaintext';
  const highlightFn = (code: string) => {
    if (lang === 'plaintext' || !languageMap[lang]) return code;
    return highlight(code, languageMap[lang], lang);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rebuilt.${language === 'auto' ? 'txt' : language}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border-4 border-black bg-white">
      <div className="flex justify-end gap-2 p-2 border-b-4 border-black">
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
        >
          <Copy size={16} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={download}
          className="flex items-center gap-2 px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
        >
          <Download size={16} />
          Download
        </button>
      </div>
      <div className="p-4 font-mono text-sm overflow-auto max-h-96">
        <Editor
          value={code}
          onValueChange={() => {}}
          highlight={highlightFn}
          padding={10}
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 14,
            backgroundColor: 'white',
            color: 'black',
          }}
          disabled
        />
      </div>
    </div>
  );
}
```

```typescript
// src/features/results/QualityReport.tsx
interface QualityReportProps {
  content: string;
}

export default function QualityReport({ content }: QualityReportProps) {
  const lines = content.split('\n').filter(line => line.trim() !== '');

  return (
    <div className="border-4 border-black p-6 bg-white">
      <ul className="list-disc list-inside space-y-2 font-mono text-sm">
        {lines.map((line, idx) => (
          <li key={idx} className="text-black">{line}</li>
        ))}
      </ul>
    </div>
  );
}
```

```typescript
// src/features/results/ExportAll.tsx
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download } from 'lucide-react';
import { useState } from 'react';

interface ExportAllProps {
  forensicDossier: string;
  rebuiltCode: string;
  qualityReport: string;
}

export default function ExportAll({ forensicDossier, rebuiltCode, qualityReport }: ExportAllProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    const zip = new JSZip();
    zip.file('forensic_dossier.md', forensicDossier);
    zip.file('rebuilt_code.txt', rebuiltCode);
    zip.file('quality_report.txt', qualityReport);
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'ai-to-production-results.zip');
    setExporting(false);
  };

  return (
    <div className="flex justify-end">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-2 px-8 py-4 bg-black text-white font-bold uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50"
      >
        <Download size={20} />
        {exporting ? 'Exporting...' : 'Export All'}
      </button>
    </div>
  );
}
```

```typescript
// src/features/admin/AdminDashboard.tsx
import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import PromptEditor from './PromptEditor';
import ModelSelector from './ModelSelector';
import HistoryTable from './HistoryTable';
import { trpc } from '../../lib/trpc';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('prompts');
  const utils = trpc.useUtils();

  // Fetch current prompts and models
  const { data: promptsData, refetch: refetchPrompts } = trpc.admin.getPrompt.useQuery();
  const { data: modelsData, refetch: refetchModels } = trpc.admin.getModel.useQuery();

  const updatePrompt = trpc.admin.updatePrompt.useMutation({
    onSuccess: () => {
      utils.admin.getPrompt.invalidate();
    },
  });
  const updateModel = trpc.admin.updateModel.useMutation({
    onSuccess: () => {
      utils.admin.getModel.invalidate();
    },
  });

  const handleSavePrompt = async (step: string, text: string) => {
    await updatePrompt.mutateAsync({ step, promptText: text });
  };

  const handleSaveModel = async (step: string, model: string) => {
    await updateModel.mutateAsync({ step, selectedModel: model });
  };

  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
      <Tabs.List className="flex border-b-4 border-black">
        <Tabs.Trigger
          value="prompts"
          className="flex-1 py-4 font-sans font-bold uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white border-r-4 border-black last:border-r-0"
        >
          System Prompts
        </Tabs.Trigger>
        <Tabs.Trigger
          value="models"
          className="flex-1 py-4 font-sans font-bold uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white border-r-4 border-black last:border-r-0"
        >
          Model Selection
        </Tabs.Trigger>
        <Tabs.Trigger
          value="history"
          className="flex-1 py-4 font-sans font-bold uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white"
        >
          Submission History
        </Tabs.Trigger>
      </Tabs.List>

      <div className="mt-8">
        {activeTab === 'prompts' && (
          <PromptEditor
            prompts={promptsData || {}}
            onSave={handleSavePrompt}
            isSaving={updatePrompt.isLoading}
          />
        )}
        {activeTab === 'models' && (
          <ModelSelector
            models={modelsData || {}}
            onSave={handleSaveModel}
            isSaving={updateModel.isLoading}
          />
        )}
        {activeTab === 'history' && <HistoryTable />}
      </div>
    </Tabs.Root>
  );
}
```

```typescript
// src/features/admin/PromptEditor.tsx
import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { Loader2, Save, Eye, EyeOff } from 'lucide-react';

const STEPS = ['forensic', 'rebuilder', 'quality'] as const;

interface PromptEditorProps {
  prompts: Record<string, string>;
  onSave: (step: string, text: string) => Promise<void>;
  isSaving: boolean;
}

export default function PromptEditor({ prompts, onSave, isSaving }: PromptEditorProps) {
  const [selectedStep, setSelectedStep] = useState<(typeof STEPS)[number]>('forensic');
  const [localPrompts, setLocalPrompts] = useState<Record<string, string>>(prompts);
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (val: string) => {
    setLocalPrompts((prev) => ({ ...prev, [selectedStep]: val }));
  };

  const handleSave = () => {
    onSave(selectedStep, localPrompts[selectedStep] || '');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {STEPS.map((step) => (
          <button
            key={step}
            onClick={() => setSelectedStep(step)}
            className={`py-6 px-4 font-black text-lg border-4 transition-colors uppercase tracking-widest ${
              selectedStep === step
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-black hover:bg-gray-100'
            }`}
          >
            {step}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="border-4 border-black overflow-hidden">
          <CodeMirror
            value={localPrompts[selectedStep] || ''}
            onChange={handleChange}
            extensions={[markdown()]}
            theme="light"
            height="400px"
            className="text-sm"
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              foldGutter: true,
              dropCursor: true,
              allowMultipleSelections: true,
              indentOnInput: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              rectangularSelection: true,
              highlightSelectionMatches: true,
            }}
          />
        </div>

        {showPreview && (
          <div className="border-4 border-black p-6 bg-white overflow-y-auto max-h-96">
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
              {localPrompts[selectedStep]}
            </pre>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
        >
          {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>

        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="font-bold">Characters:</span>{' '}
            {localPrompts[selectedStep]?.length || 0}
          </div>
          <div className="text-sm">
            <span className="font-bold">Est. Tokens:</span>{' '}
            {Math.ceil((localPrompts[selectedStep]?.length || 0) / 4)}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-4 bg-black text-white font-bold uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Prompt
            </>
          )}
        </button>
      </div>
    </div>
  );
}
```

```typescript
// src/features/admin/ModelSelector.tsx
import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';

const STEPS = ['forensic', 'rebuilder', 'quality'] as const;
const AVAILABLE_MODELS = [
  'gpt-4-turbo',
  'gpt-4o',
  'claude-3.5-sonnet',
  'gemini-2.5-flash',
] as const;

interface ModelSelectorProps {
  models: Record<string, string>;
  onSave: (step: string, model: string) => Promise<void>;
  isSaving: boolean;
}

export default function ModelSelector({ models, onSave, isSaving }: ModelSelectorProps) {
  const [localModels, setLocalModels] = useState<Record<string, string>>(models);
  const [savingStep, setSavingStep] = useState<string | null>(null);

  const handleChange = (step: string, model: string) => {
    setLocalModels((prev) => ({ ...prev, [step]: model }));
  };

  const handleSave = async (step: string) => {
    setSavingStep(step);
    await onSave(step, localModels[step] || AVAILABLE_MODELS[0]);
    setSavingStep(null);
  };

  return (
    <div className="space-y-6">
      {STEPS.map((step) => (
        <div key={step} className="border-4 border-black p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-xl font-black uppercase mb-2">{step}</h3>
              <p className="text-sm text-gray-600">Select LLM model for {step} step</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:items-center">
              <select
                value={localModels[step] || AVAILABLE_MODELS[0]}
                onChange={(e) => handleChange(step, e.target.value)}
                className="bg-white border-4 border-black p-3 font-mono text-sm focus:outline-none"
              >
                {AVAILABLE_MODELS.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleSave(step)}
                disabled={isSaving && savingStep === step}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm border-4 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {isSaving && savingStep === step ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

```typescript
// src/features/admin/HistoryTable.tsx
import { trpc } from '../../lib/trpc';
import { format } from 'date-fns';

export default function HistoryTable() {
  // In a real implementation, you'd have a query for admin.getSubmissions
  // For now, use mock data per spec
  const mockData = [
    {
      id: '1',
      user: 'alice@example.com',
      language: 'python',
      submittedAt: new Date(),
      status: 'completed',
    },
    {
      id: '2',
      user: 'bob@example.com',
      language: 'javascript',
      submittedAt: new Date(Date.now() - 3600000),
      status: 'completed',
    },
  ];

  return (
    <div className="border-4 border-black overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b-4 border-black bg-gray-100">
          <tr>
            <th className="p-4 font-sans font-bold uppercase tracking-widest">User</th>
            <th className="p-4 font-sans font-bold uppercase tracking-widest">Language</th>
            <th className="p-4 font-sans font-bold uppercase tracking-widest">Submitted</th>
            <th className="p-4 font-sans font-bold uppercase tracking-widest">Status</th>
          </tr>
        </thead>
        <tbody>
          {mockData.map((item) => (
            <tr key={item.id} className="border-b-2 border-black last:border-b-0">
              <td className="p-4 font-mono text-sm">{item.user}</td>
              <td className="p-4 font-mono text-sm">{item.language}</td>
              <td className="p-4 font-mono text-sm">
                {format(item.submittedAt, 'yyyy-MM-dd HH:mm')}
              </td>
              <td className="p-4 font-mono text-sm capitalize">{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

```typescript
// src/features/auth/LoginButton.tsx
import { trpc } from '../../lib/trpc';

export default function LoginButton() {
  // OAuth flow: redirect to backend's OAuth start endpoint
  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/manus`; // adjust as needed
  };

  return (
    <button
      onClick={handleLogin}
      className="px-6 py-3 bg-black text-white font-bold uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-colors"
    >
      Log in with Manus
    </button>
  );
}
```

```typescript
// src/features/auth/LogoutButton.tsx
import { trpc } from '../../lib/trpc';
import { useNavigate } from 'react-router-dom';

export default function LogoutButton() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      navigate('/');
    },
  });

  return (
    <button
      onClick={() => logout.mutate()}
      className="px-6 py-3 bg-black text-white font-bold uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-colors"
    >
      Logout
    </button>
  );
}
```

```css
/* src/styles/index.css */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;700;900&family=IBM+Plex+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --font-sans: 'IBM Plex Sans', system-ui, sans-serif;
    --font-mono: 'IBM Plex Mono', monospace;
  }

  body {
    @apply bg-white text-black;
    font-family: var(--font-sans);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-sans);
    font-weight: 900;
    letter-spacing: -0.02em;
  }

  code, pre, .font-mono {
    font-family: var(--font-mono);
  }
}
```

```javascript
// tailwind.config.js (if needed, but not requested – just for reference)
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderWidth: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
};
```

```json
// package.json (dependencies – not requested but useful for completeness)
{
  "name": "ai-to-production-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@radix-ui/react-tabs": "^1.0.4",
    "@tanstack/react-query": "^5.0.0",
    "@trpc/client": "^10.45.0",
    "@trpc/react-query": "^10.45.0",
    "@trpc/server": "^10.45.0",
    "@uiw/react-codemirror": "^4.21.21",
    "date-fns": "^3.0.0",
    "file-saver": "^2.0.5",
    "framer-motion": "^10.16.16",
    "jszip": "^3.10.1",
    "lucide-react": "^0.294.0",
    "prismjs": "^1.29.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-dropzone": "^14.2.3",
    "react-hook-form": "^7.48.2",
    "react-markdown": "^9.0.1",
    "react-router-dom": "^6.21.0",
    "react-simple-code-editor": "^0.13.1",
    "remark-gfm": "^4.0.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.7",
    "@types/node": "^20.10.5",
    "@types/prismjs": "^1.26.3",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.10"
  }
}
```
