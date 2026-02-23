// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_MAX_UPLOAD_SIZE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
