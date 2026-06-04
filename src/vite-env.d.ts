/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENFOOTBALL_URL?: string;
  readonly VITE_OPENFOOTBALL_TEAMS_URL?: string;
  readonly VITE_OPENFOOTBALL_STADIUMS_URL?: string;
  readonly VITE_USE_FIXTURES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
