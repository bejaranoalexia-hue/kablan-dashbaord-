// Where leads are stored. The board always asks our server (/api/board).
// If the server has no Google Sheet settings, it falls back to demo data in this browser.
import { localStore } from "./local";
import { apiStore, NotConfiguredError } from "./api";
import type { LeadStore } from "./types";

export type { LeadChange, LeadStore } from "./types";
export { auth, AuthRequiredError } from "./api";

let demo = false;

export const store: LeadStore = {
  get kind() {
    return demo ? "demo" : "sheet";
  },
  async load() {
    if (demo) return localStore.load();
    try {
      return await apiStore.load();
    } catch (e) {
      if (!(e instanceof NotConfiguredError)) throw e;
      demo = true;
      return localStore.load();
    }
  },
  save(changes) {
    return demo ? localStore.save(changes) : apiStore.save(changes);
  },
  reset() {
    return localStore.reset!();
  },
};
