// Static-hosting mode (GitHub Pages): the browser talks straight to the Apps Script web app.
// The web app URL is built into the page (it's useless without the key).
// The secret key is NOT in the page: you type it on the login screen, and this
// browser remembers it until you click "Log out".
import type { ActivityEntry, LeadUpdate } from "../../types";
import type { LeadStore } from "./types";
import { AuthRequiredError, fromRow, toSheet, type Auth, type SheetRow } from "./shared";

const KEY_STORAGE = "lead-board:access-key";

function savedKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

function rememberKey(key: string | null) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // storage blocked (private window): the key just won't be remembered
  }
}

// Kept in memory too, so the board works even where localStorage is blocked.
let sessionKey = "";

type Reply = {
  ok: boolean;
  error?: string;
  leads?: SheetRow[];
  activity?: ActivityEntry[];
  updates?: LeadUpdate[];
  update?: LeadUpdate;
};

export function createDirectStore(url: string): { store: LeadStore; auth: Auth } {
  async function call(body: object, key: string): Promise<Reply> {
    let res: Response;
    try {
      // text/plain keeps this a "simple" request, which Apps Script accepts from the browser.
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...body, key }),
      });
    } catch {
      throw new Error("Couldn't reach the Google Sheet. Check your internet connection.");
    }
    let data: Reply;
    try {
      data = (await res.json()) as Reply;
    } catch {
      throw new Error('The Google Sheet web app didn\'t send back data. Is it deployed with access set to "Anyone"?');
    }
    if (!data.ok) {
      if (data.error === "Wrong key.") throw new AuthRequiredError("Wrong access key.");
      throw new Error(`Google Sheet: ${data.error ?? "unknown error"}`);
    }
    return data;
  }

  function key() {
    const k = sessionKey || savedKey();
    if (!k) throw new AuthRequiredError("Please log in.");
    return k;
  }

  const store: LeadStore = {
    kind: "sheet",
    async load() {
      try {
        const data = await call({ action: "list" }, key());
        return (data.leads ?? []).map(fromRow);
      } catch (e) {
        if (e instanceof AuthRequiredError) {
          sessionKey = "";
          rememberKey(null); // a saved key that stopped working (e.g. it was changed)
        }
        throw e;
      }
    },
    async save(changes) {
      await call({ action: "update", leads: changes.map((c) => ({ id: c.id, ...toSheet(c.changes) })) }, key());
    },
    async activity(id) {
      const data = await call({ action: "activity", id }, key());
      return data.activity ?? [];
    },
    async updates(id) {
      const data = await call({ action: "updates", id }, key());
      return data.updates ?? [];
    },
    async addUpdate(id, text) {
      const data = await call({ action: "addUpdate", id, text }, key());
      return data.update as LeadUpdate;
    },
    async deleteUpdate(updateId) {
      await call({ action: "deleteUpdate", updateId }, key());
    },
  };

  const auth: Auth = {
    label: { field: "Access key", hint: "Enter your access key to open your board" },
    async passwordRequired() {
      return true;
    },
    async login(password) {
      const candidate = password.trim();
      try {
        await call({ action: "list" }, candidate); // check it before remembering it
      } catch (e) {
        if (e instanceof AuthRequiredError) throw new Error("Wrong access key.");
        throw e;
      }
      sessionKey = candidate;
      rememberKey(candidate);
    },
    async logout() {
      sessionKey = "";
      rememberKey(null);
    },
  };

  return { store, auth };
}
