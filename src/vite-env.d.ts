/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENFOOTBALL_URL?: string;
  readonly VITE_OPENFOOTBALL_TEAMS_URL?: string;
  readonly VITE_OPENFOOTBALL_STADIUMS_URL?: string;
  readonly VITE_USE_FIXTURES?: string;
  readonly VITE_BZZOIRO_API_URL?: string;
  readonly VITE_BZZOIRO_WS_URL?: string;
  readonly VITE_BZZOIRO_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
