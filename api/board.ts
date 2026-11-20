// Server function: the only place that knows the Google Sheet URL and secret key.
// On Vercel this file becomes the endpoint /api/board. Locally, vite.config.ts serves it.
//
// Settings (environment variables, never sent to the browser):
//   SHEET_URL       Apps Script web app URL (ends in /exec)
//   SHEET_KEY       must match the SECRET script property in Apps Script
//   APP_PASSWORD    password for the login screen. Required when hosted online.
//                   Locally (localhost) you can leave it empty to skip the login.
//   SESSION_SECRET  optional; signs login cookies. Derived from the values above if empty.
//
// This file is self-contained on purpose (no imports from the app), so it deploys as-is.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "lb_session";
const SESSION_DAYS = 30;

type Json = Record<string, unknown>;

function json(body: Json, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

function isLocalhost(request: Request) {
  const host = new URL(request.url).hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function sha256(text: string) {
  return createHash("sha256").update(text).digest();
}

/** Compare secrets without leaking how many characters matched. */
function safeEqual(a: string, b: string) {
  return timingSafeEqual(sha256(a), sha256(b));
}

function sessionSecret() {
  // Changing the password (or key) automatically logs out every existing session.
  return env("SESSION_SECRET") || sha256(`lead-board|${env("APP_PASSWORD")}|${env("SHEET_KEY")}`).toString("hex");
}

function sign(expires: number) {
  return createHmac("sha256", sessionSecret()).update(`v1.${expires}`).digest("base64url");
}

function readCookie(request: Request, name: string) {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

function sessionCookie(request: Request, value: string, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

type AuthState = "ok" | "login" | "misconfigured";

function authState(request: Request): AuthState {
  if (!env("APP_PASSWORD")) return isLocalhost(request) ? "ok" : "misconfigured"; // never open online without a password
  const [expires, sig] = readCookie(request, COOKIE).split(".");
  const exp = Number(expires);
  if (!sig || !Number.isFinite(exp) || exp < Date.now() / 1000) return "login";
  return safeEqual(sig, sign(exp)) ? "ok" : "login";
}

async function callSheet(body: Json): Promise<Json> {
  let res: Response;
  try {
    // Apps Script answers with a redirect; fetch follows it.
    res = await fetch(env("SHEET_URL"), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...body, key: env("SHEET_KEY") }),
      redirect: "follow",
    });
  } catch {
    return { ok: false, error: "The server couldn't reach the Google Sheet web app." };
  }
  try {
    return (await res.json()) as Json;
  } catch {
    return {
      ok: false,
      error: 'The Google Sheet web app didn\'t send back data. Is it deployed with access set to "Anyone"?',
    };
  }
}

/** GET /api/board: is the server set up, and is this browser logged in? */
export async function GET(request: Request) {
  return json({
    ok: true,
    configured: Boolean(env("SHEET_URL") && env("SHEET_KEY")),
    passwordRequired: Boolean(env("APP_PASSWORD")),
    auth: authState(request),
  });
}

/** POST /api/board with {action: "login" | "logout" | "list" | "update" | "activity" | "updates" | "addUpdate" | "deleteUpdate", ...}. */
export async function POST(request: Request) {
  let body: Json;
  try {
    body = (await request.json()) as Json;
  } catch {
    return json({ ok: false, error: "Bad request." }, 400);
  }

  if (body.action === "login") {
    const password = env("APP_PASSWORD");
    if (!password) return json({ ok: false, code: "misconfigured", error: "APP_PASSWORD is not set on the server." }, 500);
    if (typeof body.password !== "string" || !safeEqual(body.password, password)) {
      await new Promise((r) => setTimeout(r, 1000)); // slow down password guessing
      return json({ ok: false, code: "wrong_password", error: "Wrong password." }, 401);
    }
    const maxAge = SESSION_DAYS * 24 * 60 * 60;
    const expires = Math.floor(Date.now() / 1000) + maxAge;
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(request, `${expires}.${sign(expires)}`, maxAge) });
  }

  if (body.action === "logout") {
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(request, "", 0) });
  }

  const state = authState(request);
  if (state === "misconfigured") {
    return json({ ok: false, code: "misconfigured", error: "APP_PASSWORD is not set on the server, so access is blocked." }, 500);
  }
  if (state === "login") return json({ ok: false, code: "unauthorized", error: "Please log in." }, 401);

  if (!env("SHEET_URL") || !env("SHEET_KEY")) {
    return json({ ok: false, code: "not_configured", error: "SHEET_URL and SHEET_KEY are not set." }, 503);
  }

  if (body.action === "list") return json(await callSheet({ action: "list" }));
  if (body.action === "activity" || body.action === "updates") {
    if (typeof body.id !== "string" || !body.id) return json({ ok: false, error: "Bad request." }, 400);
    return json(await callSheet({ action: body.action, id: body.id }));
  }
  if (body.action === "addUpdate") {
    if (typeof body.id !== "string" || !body.id || typeof body.text !== "string") {
      return json({ ok: false, error: "Bad request." }, 400);
    }
    return json(await callSheet({ action: "addUpdate", id: body.id, text: body.text }));
  }
  if (body.action === "deleteUpdate") {
    if (typeof body.updateId !== "string" || !body.updateId) return json({ ok: false, error: "Bad request." }, 400);
    return json(await callSheet({ action: "deleteUpdate", updateId: body.updateId }));
  }
  if (body.action === "update") {
    if (!Array.isArray(body.leads)) return json({ ok: false, error: "Bad request." }, 400);
    return json(await callSheet({ action: "update", leads: body.leads }));
  }
  return json({ ok: false, error: "Unknown action." }, 400);
}
