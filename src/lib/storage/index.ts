// Where leads are stored.
//   Normal (npm run dev, or a host with server functions): ask our server, /api/board.
//   Static (GitHub Pages, built with VITE_STATIC=true): talk to the Apps Script directly,
//     with the key typed on the login screen.
// If no Sheet is configured, fall back to demo data in this browser.
import { localStore } from "./local";
import { apiAuth, apiStore } from "./api";
import { createDirectStore } from "./direct";
import { NotConfiguredError, type Auth } from "./shared";
import type { LeadStore } from "./types";

export type { LeadChange, LeadStore } from "./types";
export { AuthRequiredError } from "./shared";

const isStatic = import.meta.env.VITE_STATIC === "true";
const staticUrl = (import.meta.env.VITE_SHEET_URL ?? "").trim();

const noLogin: Auth = {
  label: { field: "", hint: "" },
  passwordRequired: async () => false,
  login: async () => {},
  logout: async () => {},
};

let remote: LeadStore;
export let auth: Auth;
if (isStatic) {
  if (staticUrl) ({ store: remote, auth } = createDirectStore(staticUrl));
  else {
    remote = { kind: "sheet", load: () => Promise.reject(new NotConfiguredError()), save: async () => {} };
    auth = noLogin;
  }
} else {
  remote = apiStore;
  auth = apiAuth;
}

let demo = false;

export const store: LeadStore = {
  get kind() {
    return demo ? "demo" : "sheet";
  },
  async load() {
    if (demo) return localStore.load();
    try {
      return await remote.load();
    } catch (e) {
      if (!(e instanceof NotConfiguredError)) throw e;
      demo = true;
      auth = noLogin;
      return localStore.load();
    }
  },
  save(changes) {
    return demo ? localStore.save(changes) : remote.save(changes);
  },
  reset() {
    return localStore.reset!();
  },
};
