export type PlayerImageSource =
  | 'wikidata-national-team'
  | 'wikidata-tournament'
  | 'wikidata-national-team-training'
  | 'wikidata-portrait'
  | 'manual-override'
  | 'generated-fallback';

export type PlayerImage = {
  /** Path served by Vite, relative to site root, e.g. `/images/players/arg-10-messi.webp`. */
  url: string;
  width: number;
  height: number;
  source: PlayerImageSource;
  /** SHA1 of the original Commons file (32 hex chars). Lets the scraper detect upstream changes. */
  hash: string;
  /** ISO timestamp when this entry was generated. */
  generatedAt: string;
  /** Commons attribution text for credits page. Empty string when source is 'generated-fallback'. */
  attribution: string;
};
