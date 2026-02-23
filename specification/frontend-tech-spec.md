Front-End Technical Specification: AI to Production

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