/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" when built for static hosting (GitHub Pages). */
  readonly VITE_STATIC?: string;
  /** Apps Script web app URL, only used in static builds. Not secret on its own. */
  readonly VITE_SHEET_URL?: string;
}
