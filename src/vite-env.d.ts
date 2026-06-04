/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_FOOTBALL_KEY?: string;
  readonly VITE_API_FOOTBALL_BASE_URL?: string;
  readonly VITE_BDL_KEY?: string;
  readonly VITE_BDL_BASE_URL?: string;
  readonly VITE_USE_FIXTURES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
