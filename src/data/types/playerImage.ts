export type PlayerImageSource =
  | 'motif-curated'      // hand-crafted SVG motif (star players)
  | 'motif-default';     // auto-generated SVG from name+jersey hash

export type PlayerImage = {
  /** Path served by Vite, relative to site root, e.g. `/images/players/ar-10-lionel-messi.svg`. Full 600x800 card. */
  url: string;
  /** Compact 360x360 motif-only crop, no signature/footer text. Used at xs/sm portrait sizes. */
  iconUrl?: string;
  width: number;
  height: number;
  source: PlayerImageSource;
  /** SHA1 of the original Commons file (40 hex chars). Lets the scraper detect upstream changes. */
  hash: string;
  /** ISO timestamp when this entry was generated. */
  generatedAt: string;
  /** Commons attribution text for credits page. Empty string when source is 'generated-fallback'. */
  attribution: string;
};
