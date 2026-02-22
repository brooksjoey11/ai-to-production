```
# AI TO PRODUCTION – COMPLETE BUILD SPECIFICATION

## MISSION
Build a production‑ready, high‑credibility SaaS web application called **AI to Production** that automatically fixes AI‑generated code. The system must accept user code (paste or file upload), run it through a three‑step **fresh‑instance LLM pipeline**, and return improved code plus a forensic dossier and manager report. All components must run on Google Cloud Platform (GCP) with minimal complexity and cost.

---

## 1. CORE PIPELINE LOGIC (STATELESS SEQUENTIAL CHAIN)
The backend must execute three independent LLM calls in strict order. Each call uses a **fresh instance** (no shared memory) and must be configurable via the admin UI. The pipeline inputs and outputs are clearly defined.

### Step 1 – Forensic Analysis
- **Input**: User code (string) + optional user comments (string).
- **System Prompt**: `CODE_ANALYZER` (full text provided below).
- **Output**: A structured “Forensic Dossier” (plain text). This output must be saved and passed to Step 2.

### Step 2 – Code Reconstruction
- **Input**: Original user code + user comments + Forensic Dossier from Step 1.
- **System Prompt**: `CODE_REBUILDER` (full text provided below).
- **Output**: Production‑ready reconstructed code (string). Pass this to Step 3.

### Step 3 – Manager Report
- **Input**: Original user code + Forensic Dossier + reconstructed code.
- **System Prompt**:
```

Act as a Senior Project Manager. Generate a high-level report for a hobbyist user. Summarize:

1. Critical failures found in the original code.
2. Key structural fixes implemented.
3. Validation steps the user should perform after receiving the fixed code.
   Use a direct, expert tone. Zero AI safety lecturing, zero fluff.

```
- **Output**: A concise report (3–5 bullet points or short paragraphs).

### Error Handling
- If any LLM call fails (timeout, invalid response), retry **once after 2 seconds**.
- If the retry fails, return a user‑friendly error message (no stack traces) and log the failure to Cloud Logging.

---

## 2. FRONTEND (NEXT.JS + TAILWIND CSS)

### Aesthetic – Linear.app Design Language
- **Color Palette**:
  - Background: `#050505` (near black)
  - Surface: `#0b0f1a` (cards, input areas)
  - Primary text: `#f1f5f9`
  - Secondary text: `#94a3b8`
  - Accent: `#3b82f6` (Electric Blue)
  - Borders: `#2d3748`
- **Typography**:
  - Headings: `Inter Tight` (or `Inter`), bold, letter‑spacing -0.02em
  - Code blocks: `Geist Mono` (or `JetBrains Mono`)
- **Corners**: 8px rounded corners for cards, inputs, buttons.
- **Glow effects**: Subtle blue glow on hover for primary buttons.

### Landing Page (Single Page, Centered Vertical Flow)
1. **Hero Section**:
   - Large code‑diff visualizer (animated or static) showing “AI Junk → Clean Code”.
   - Headline: “Code the AI wrote, the way it should’ve.”
   - Subhead: “We bridge the gap between ‘it looks right’ and ‘it works in production.’ Defensive, validated, and documented code reconstruction.”
2. **Input Area**:
   - Prominent textarea with placeholder: “Paste your AI‑generated code here…”
   - File upload button (📁) for scripts up to 1 MB (client‑side size check).
   - “Fix My Code” button – large, blue, with loading state.
   - Rate limit warning: if user exceeds 5 requests per hour, show a message and disable the button.
3. **Processing Indicator**:
   - While pipeline runs, show a progress tracker with three steps:
     - 🔍 Auditing...
     - 🔧 Reconstructing...
     - 📋 Finalizing Report...
   - Each step lights up as it completes.
4. **Results Display** (after processing):
   - Tabbed interface with three tabs:
     - **Fixed Code** – read‑only code editor with syntax highlighting, download button (original filename + “_fixed” + extension).
     - **Forensic Dossier** – formatted markdown (or plain text) showing the detailed analysis.
     - **Manager Report** – styled bullet points / short paragraphs.
5. **Footer**: Links to GitHub, Contact, © notice.

### Additional Frontend Requirements
- Responsive design (mobile, tablet, desktop).
- Dark mode only (no light mode).
- Client‑side rate limiting check (optional, but backend enforces).
- No user authentication required for MVP.

---

## 3. BACKEND (FASTAPI)

### Endpoints
- `POST /api/fix`
  - Request body: `{ "code": str, "comments": str }` (comments optional)
  - Response: `{ "fixed_code": str, "dossier": str, "report": str }`
  - On error: `{ "error": "user-friendly message" }` with appropriate HTTP status (429 for rate limit, 500 for internal).
- `GET /api/health` – returns `{"status": "ok"}`.
- Admin endpoints (protected, see section 4).

### Rate Limiting
- Implement per‑IP rate limiting: **5 requests per rolling hour**.
- Use Firestore to store IP addresses and timestamps. On each request, query recent timestamps; if count >= 5, reject with 429.
- Reset after 1 hour.

### Configuration & Secrets
- All API keys (Anthropic, OpenAI, Google AI) stored in **GCP Secret Manager**.
- System prompts, model selections, and other settings stored in **Firestore** (collection: `config`).
- Backend reads Firestore on each request (with a short‑lived in‑memory cache to reduce reads) to get the current prompts and model choices. Changes made in admin UI take effect immediately.

### LLM Integration (Factory Pattern)
- Support three providers: Claude 3.5 Sonnet, GPT‑4o, Gemini 1.5 Pro.
- For each step, the admin UI can select which model to use (could be different per step).
- The backend uses a factory to instantiate the correct client based on the configured model.
- All API calls must include `temperature=0.2` (or configurable) and `max_tokens=8000` (or configurable).

### Error Logging
- Use Cloud Logging for all errors and pipeline failures.
- Include request ID for traceability.

---

## 4. ADMIN UI (NO‑CODE CONTROL PANEL)

### Route and Authentication
- Protected route: `/admin`
- Simple password protection: HTTP Basic Auth or single password stored in environment variable `ADMIN_PASSWORD`. (If using Basic Auth, provide instructions to set it up in Cloud Run.)

### Dashboard Sections

#### 4.1 Prompt Lab
- Three large text areas, each with a label:
  - **Forensic Analysis Prompt** (CODE_ANALYZER)
  - **Code Reconstruction Prompt** (CODE_REBUILDER)
  - **Manager Report Prompt**
- “Save Changes” button – updates the corresponding Firestore documents.
- Each text area should support markdown and be pre‑filled with the current prompts.

#### 4.2 Model Configuration
- For each of the three steps, a dropdown to select the model:
  - Claude 3.5 Sonnet
  - GPT‑4o
  - Gemini 1.5 Pro
- Optional: temperature slider (0.0–1.0) and max tokens field (default 8000).
- “Save Model Config” button – updates Firestore.

#### 4.3 API Key Management
- Simple interface to update API keys (three fields: Anthropic, OpenAI, Google).
- On save, the backend updates the secrets in Secret Manager (using GCP API). Provide clear instructions that the service account must have `secretmanager.secretVersionAdder` permission.

#### 4.4 Usage Dashboard (Bonus)
- Display approximate token usage and cost for the last 30 days. Can be pulled from Cloud Logging or a simple counter in Firestore (increment on each request). Not critical but nice to have.

### Technical Implementation
- Admin UI is a separate page served by the same Next.js frontend (or could be a separate route in FastAPI with Jinja2 templates – but keep it simple: use Next.js for the whole frontend, including admin).
- All admin API endpoints under `/api/admin/*` must be protected with the same password (via middleware or session).

---

## 5. DATA STORAGE (FIRESTORE)

### Collections
- `config/prompts` – document with fields: `analyzer`, `rebuilder`, `manager` (strings).
- `config/models` – document with fields: `step1_model`, `step2_model`, `step3_model`, `temperature`, `max_tokens`.
- `rate_limits` – collection of IP‑based rate limit records (each document: `ip`, `timestamps` array).
- Optional: `usage` – collection to log each request for analytics (timestamp, tokens used, etc.).

### Firestore Security Rules (if using Firestore Native)
- Only allow reads/writes from the backend service account (not directly from client). The backend uses the Firebase Admin SDK or Google Cloud client library with default credentials.

---

## 6. DEPLOYMENT ON GOOGLE CLOUD PLATFORM

### Architecture Overview
- **Frontend**: Static Next.js export hosted on Cloud Storage + Cloud CDN, or served via Cloud Run (if using Next.js with API routes). **Recommendation**: Use Next.js standalone output and deploy as a single Cloud Run service (simpler).
- **Backend**: FastAPI app, containerized, deployed on Cloud Run.
- **Database**: Firestore Native.
- **Secrets**: Secret Manager.
- **Monitoring**: Cloud Logging, Error Reporting, Cloud Monitoring (optional).

### Dockerfile (Backend)
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

requirements.txt (Backend)

```
fastapi==0.115.0
uvicorn[standard]==0.30.1
anthropic==0.34.2
openai==1.40.0
google-generativeai==0.7.2
google-cloud-firestore==2.16.0
google-cloud-secret-manager==2.20.0
python-dotenv==1.0.0
httpx==0.27.0
tenacity==8.5.0
```

Frontend Build (Next.js)

· Use create-next-app with Tailwind CSS.
· Configure next.config.js for standalone output (if deploying on Cloud Run) or static export (if using Cloud Storage).
· API routes in Next.js can proxy to the FastAPI backend, or the frontend can call the backend directly. Simpler: Have Next.js serve the UI and call the FastAPI backend (CORS enabled). We'll set FastAPI with CORS middleware.

Deployment Commands

After building the Docker image, deploy to Cloud Run:

```bash
# Build and push image to Google Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ai-to-production-backend

# Deploy backend
gcloud run deploy ai-to-production-backend \
  --image gcr.io/YOUR_PROJECT_ID/ai-to-production-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "FIRESTORE_COLLECTION=config,GCP_PROJECT=YOUR_PROJECT_ID" \
  --update-secrets=ANTHROPIC_API_KEY=anthropic-key:latest,OPENAI_API_KEY=openai-key:latest,GEMINI_API_KEY=gemini-key:latest

# Deploy frontend (if using Cloud Run for Next.js)
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ai-to-production-frontend ./frontend
gcloud run deploy ai-to-production-frontend \
  --image gcr.io/YOUR_PROJECT_ID/ai-to-production-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "BACKEND_URL=https://backend-url.a.run.app"
```

If using Cloud Storage for static frontend:

```bash
# Export static site
npm run build && npm run export
# Copy to bucket
gsutil cp -r out/* gs://YOUR_BUCKET_NAME
# Set up bucket for website and CDN
```

Environment Variables & Secrets

· Create secrets in Secret Manager:
  · anthropic-key
  · openai-key
  · gemini-key
· Set environment variables in Cloud Run:
  · FIRESTORE_COLLECTION=config
  · GCP_PROJECT=your-project-id
  · ADMIN_PASSWORD (optional, for admin UI)

---

## 7. PROPRIETARY PROMPTS (EMBED EXACTLY)

CODE_ANALYZER

[View the full CODE_ANALYZER prompt](./prompts/CODE_ANALYZER.md)

CODE_REBUILDER

[View the full CODE_REBUILDER prompt](./prompts/CODE_REBUILDER.md)

MANAGER REPORT PROMPT

```
Act as a Senior Project Manager. Generate a high-level report for a hobbyist user. Summarize:
1. Critical failures found in the original code.
2. Key structural fixes implemented.
3. Validation steps the user should perform after receiving the fixed code.
Use a direct, expert tone. Zero AI safety lecturing, zero fluff.
```

---

## 8. ADDITIONAL REQUIREMENTS

· No placeholders: All configuration values must be read from environment variables or Firestore. No YOUR_API_KEY in code.
· Zero ethical/moral/safety commentary in the code or output. The focus is purely technical.
· Comments in the code only where necessary to explain non‑obvious logic.
· After building, output the full project (all files) in a structured way, followed by the Dockerfile and deployment commands.
· Provide a README.md with setup instructions for local development and deployment.

---

## 9. FINAL CHECKLIST

Before finalizing, ensure:

· Three‑step pipeline is correctly implemented with fresh instances.
· Firestore stores prompts and model config; backend reads them on each request.
· Admin UI can edit prompts and change models without code changes.
· Frontend matches Linear aesthetic and displays all three outputs in tabs.
· Rate limiting (5/hour) is enforced.
· API keys are stored in Secret Manager.
· Dockerfile and deployment commands are accurate.
· All prompts are included verbatim.
· No placeholders remain.

```
