/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AEGIS_API_URL?: string;
  readonly VITE_AEGIS_REVISION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
