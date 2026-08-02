import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";

const BASE_URL = "https://www.alightpro.my.id";
const TIMEOUT = 60000;
const FLOW_COOKIE = "alightpro_flow";
const UPSTREAM_SESSION_COOKIE = "__amprem_session";

/**
 * Proof-of-Work identik dengan browser: brute-force counter sampai
 * sha256(`${sessionId}:${nonce}:${email}:${action}:${counter}`) diawali `difficulty`.
 * Nilai yang dikirim sebagai X-Amprem-Pow adalah counter-nya, bukan hash.
 */
function computePow(
  sessionId: string,
  nonce: string,
  email: string,
  action: "send" | "verify",
  difficulty: string,
): string {
  const prefix = `${sessionId}:${nonce}:${email.toLowerCase()}:${action}:`;
  for (let i = 0; i < 500000; i++) {
    const hash = createHash("sha256")
      .update(prefix + String(i))
      .digest("hex");
    if (hash.startsWith(difficulty)) return String(i);
  }
  return String(Date.now());
}


const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
  Origin: BASE_URL,
  Referer: `${BASE_URL}/`,
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
};

async function fetchWithTimeout(url: string, init: RequestInit) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

/** Simple cookie jar: keeps __amprem_session etc. across the request chain. */
function makeJar(initialSession?: string) {
  const store = new Map<string, string>();
  if (initialSession) store.set(UPSTREAM_SESSION_COOKIE, initialSession);

  return {
    absorb(res: Response) {
      const h = res.headers as Headers & { getSetCookie?: () => string[] };
      const list = typeof h.getSetCookie === "function"
        ? h.getSetCookie()
        : (res.headers.get("set-cookie") || "").split(/,(?=\s*[A-Za-z_][\w.-]*=)/);
      for (const c of list) {
        const pair = c.split(";")[0]?.trim();
        if (!pair) continue;
        const idx = pair.indexOf("=");
        if (idx > 0) store.set(pair.slice(0, idx), pair.slice(idx + 1));
      }
    },
    header() {
      return [...store.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    get(name: string) {
      return store.get(name);
    },
  };
}

function readFlowCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== FLOW_COOKIE) continue;
    try {
      const value = decodeURIComponent(rawValue.join("="));
      if (value.length <= 2048 && !/[\r\n;]/.test(value)) return value;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function flowCookieHeader(session: string): string {
  return `${FLOW_COOKIE}=${encodeURIComponent(session)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=900`;
}

async function handle(email: string, link: string | null, initialSession?: string) {
  if (!email) return { success: false, error: "Email wajib diisi" };

  const jar = makeJar(link ? initialSession : undefined);

  // A verification link is bound to the browser session that requested it.
  // Only create a fresh upstream session at the beginning of a send flow.
  if (!link || !initialSession) {
    const home = await fetchWithTimeout(`${BASE_URL}/`, {
      headers: {
        ...BROWSER_HEADERS,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Dest": "document",
      },
    });
    jar.absorb(home);
  }

  // Step 2: get session token/nonce/timestamp
  const sr = await fetchWithTimeout(`${BASE_URL}/api/session`, {
    headers: {
      ...BROWSER_HEADERS,
      "X-Requested-With": "XMLHttpRequest",
      ...(jar.header() ? { Cookie: jar.header() } : {}),
    },
  });
  jar.absorb(sr);
  const session = (await sr.json().catch(() => ({}))) as {
    status?: boolean;
    token?: string;
    nonce?: string;
    sessionId?: string;
    timestamp?: string;
    difficulty?: string;
    msg?: string;
  };
  if (!sr.ok || !session.status || !session.token || !session.nonce) {
    return { success: false, error: session.msg || `Invalid session response (${sr.status})` };
  }

  const action: "send" | "verify" = link ? "verify" : "send";
  const pow = computePow(
    session.sessionId || "",
    session.nonce,
    email,
    action,
    session.difficulty || "0000",
  );

  const headers = {
    ...BROWSER_HEADERS,
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "X-Amprem-Token": session.token,
    "X-Amprem-Nonce": session.nonce,
    "X-Amprem-Pow": pow,
    ...(jar.header() ? { Cookie: jar.header() } : {}),
  };

  if (link) {
    const r = await fetchWithTimeout(`${BASE_URL}/api/alight-motion`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "verify", email, link }),
    });
    const data = (await r.json().catch(() => ({}))) as {
      status?: boolean;
      data?: unknown;
      msg?: string;
    };
    const verified = r.ok && data?.status !== false;
    return {
      success: verified,
      email,
      message: verified ? "Account verified successfully" : data?.msg || "Verifikasi gagal",
      premium: verified,
      duration: "1 Tahun",
      data: data?.data ?? data ?? null,
      flowSession: jar.get(UPSTREAM_SESSION_COOKIE),
    };
  }

  const r = await fetchWithTimeout(`${BASE_URL}/api/alight-motion`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "send", email }),
  });
  const data = (await r.json().catch(() => ({}))) as { status?: boolean; msg?: string };
  const sent = r.ok && data?.status !== false;
  return {
    success: sent,
    email,
    message: data?.msg || (sent ? "Link berhasil dikirim" : "Gagal mengirim link"),
    instructions: [
      "Buka inbox email (cek folder Spam juga)",
      'Cari email dari "Alight Motion" / "Alight Creative"',
      'Tekan-tahan tombol "Login ke Alight Creative", pilih "Salin URL"',
      "Jangan klik langsung — copy link doang",
      "Paste link tersebut ke form Verify di halaman ini",
    ],
    flowSession: jar.get(UPSTREAM_SESSION_COOKIE),
  };
}

export const Route = createFileRoute("/api/public/alight")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { email?: string; link?: string };
          const result = await handle(
            body.email || "",
            body.link || null,
            readFlowCookie(request),
          );
          const { flowSession, ...publicResult } = result;
          const headers = new Headers();
          if (flowSession) headers.set("Set-Cookie", flowCookieHeader(flowSession));
          return Response.json(publicResult, { headers });
        } catch (e) {
          return Response.json(
            { success: false, error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }
      },
    },
  },
});
