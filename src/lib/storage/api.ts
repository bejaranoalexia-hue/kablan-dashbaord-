// Talks to our own server function (api/board.ts), which talks to the Google Sheet.
// The Sheet URL and secret key live only on the server, never in the browser.
import type { LeadStore } from "./types";
import { AuthRequiredError, NotConfiguredError, fromRow, toSheet, type Auth, type SheetRow } from "./shared";

const ENDPOINT = "/api/board";

type Reply = { ok: boolean; code?: string; error?: string; [k: string]: unknown };

async function post(body: object): Promise<Reply> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach the Lead Board server. Check your internet connection.");
  }
  let data: Reply;
  try {
    data = (await res.json()) as Reply;
  } catch {
    throw new Error(`The Lead Board server had a problem (error ${res.status}).`);
  }
  if (!data.ok) {
    if (data.code === "unauthorized") throw new AuthRequiredError(data.error);
    if (data.code === "not_configured") throw new NotConfiguredError(data.error);
    throw new Error(data.error ?? "Unknown error from the server.");
  }
  return data;
}

export const apiStore: LeadStore = {
  kind: "sheet",
  async load() {
    const data = await post({ action: "list" });
    return ((data.leads as SheetRow[] | undefined) ?? []).map(fromRow);
  },
  async save(changes) {
    await post({ action: "update", leads: changes.map((c) => ({ id: c.id, ...toSheet(c.changes) })) });
  },
};

export const apiAuth: Auth = {
  label: { field: "Password", hint: "Enter your password to open your board" },
  async passwordRequired() {
    try {
      const res = await fetch(ENDPOINT, { credentials: "same-origin" });
      const data = (await res.json()) as { passwordRequired?: boolean };
      return Boolean(data.passwordRequired);
    } catch {
      return false;
    }
  },
  async login(password) {
    await post({ action: "login", password });
  },
  async logout() {
    await post({ action: "logout" });
  },
};
