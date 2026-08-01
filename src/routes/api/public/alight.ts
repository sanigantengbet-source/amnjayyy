import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";

const BASE_URL = "https://www.alightpro.my.id";
const TIMEOUT = 60000;

const POW_SECRET = "amprem-super-secret-key-2026-v2";

function computePow(
  email: string,
  action: "send" | "verify",
  nonce: string,
  timestamp: string,
  sessionId: string,
): string {
  const payload = `${email.toLowerCase()}:${action}:${nonce}:${timestamp}:${sessionId}:${POW_SECRET}`;
  return createHash("sha256").update(payload).digest("hex");
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

async function getSession() {
  const r = await fetchWithTimeout(`${BASE_URL}/api/session`, {
    headers: { ...BROWSER_HEADERS, "X-Requested-With": "XMLHttpRequest" },
  });
  if (!r.ok) throw new Error(`session ${r.status}`);
  const cookie = (r.headers.get("set-cookie") || "")
    .split(/,(?=\s*__?[A-Za-z])/)
    .map((c) => c.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
  const data = (await r.json()) as {
    token: string;
    nonce: string;
    sessionId: string;
    timestamp: string;
  };
  return { ...data, cookie };
}

async function handle(email: string, link: string | null) {
  if (!email) return { success: false, error: "Email wajib diisi" };

  const session = await getSession();
  const action: "send" | "verify" = link ? "verify" : "send";
  const pow = computePow(email, action, session.nonce, session.timestamp, session.sessionId);


  const headers = {
    ...BROWSER_HEADERS,
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "X-Amprem-Token": session.token,
    "X-Amprem-Nonce": session.nonce,
    "X-Amprem-Pow": pow,
    ...(session.cookie ? { Cookie: session.cookie } : {}),
  };

  if (link) {
    const r = await fetchWithTimeout(`${BASE_URL}/api/alight-motion`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "verify", email, link }),
    });
    const data = (await r.json().catch(() => ({}))) as { data?: unknown };
    return {
      success: r.ok,
      email,
      message: r.ok ? "Account verified successfully" : "Verifikasi gagal",
      premium: r.ok,
      duration: "1 Tahun",
      data: data?.data ?? data ?? null,
    };
  }

  const r = await fetchWithTimeout(`${BASE_URL}/api/alight-motion`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "send", email }),
  });
  const data = (await r.json().catch(() => ({}))) as { msg?: string };
  return {
    success: r.ok,
    email,
    message: data?.msg || (r.ok ? "Link berhasil dikirim" : "Gagal mengirim link"),
    instructions: [
      "Buka inbox email (cek folder Spam juga)",
      'Cari email dari "Alight Motion" / "Alight Creative"',
      'Tekan-tahan tombol "Login ke Alight Creative", pilih "Salin URL"',
      "Jangan klik langsung — copy link doang",
      "Paste link tersebut ke form Verify di halaman ini",
    ],
  };
}

export const Route = createFileRoute("/api/public/alight")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { email?: string; link?: string };
          const result = await handle(body.email || "", body.link || null);
          return Response.json(result);
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
