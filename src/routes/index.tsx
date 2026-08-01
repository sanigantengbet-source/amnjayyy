import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Mail, Link2, Loader2, CheckCircle2, XCircle, Send, ShieldCheck } from "lucide-react";
import { SuccessFlow } from "@/components/success-flow";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AlightPro — Premium Generator" },
      { name: "description", content: "Generate akun Alight Motion Premium 1 Tahun via magic link." },
      { property: "og:title", content: "AlightPro — Premium Generator" },
      { property: "og:description", content: "Generate akun Alight Motion Premium 1 Tahun via magic link." },
    ],
  }),
  component: Index,
});

type ApiResult = {
  success: boolean;
  email?: string;
  message?: string;
  premium?: boolean;
  duration?: string;
  instructions?: string[];
  error?: unknown;
  data?: unknown;
};

function Index() {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [mode, setMode] = useState<"send" | "verify">("send");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/public/alight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, link: mode === "verify" ? link : undefined }),
      });
      setResult(await res.json());
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }

  const verified = result?.success === true && mode === "verify";

  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            <span className="glass flex h-7 w-7 items-center justify-center rounded-full text-brand-blue">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            AlightPro
          </div>
          <span className="glass-soft rounded-full px-3 py-1.5 text-xs text-muted-foreground">
            SANN404 FORUM GROUP
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <div className="max-w-xl">
          <div className="glass-soft mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
            Alight Motion Premium · 1 Tahun
          </div>
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-tight sm:text-[44px]">
            Premium generator that works for you.
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Kirim magic link ke email kamu, salin URL dari inbox, lalu verifikasi untuk
            mengaktifkan premium 1 tahun.
          </p>
        </div>

        <div className="glass mt-10 rounded-2xl p-6">
          <div className="mb-6 flex gap-2">
            {(["send", "verify"] as const).map((m) => {
              const Icon = m === "send" ? Send : ShieldCheck;
              const activeMode = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    activeMode
                      ? "border-brand-blue/40 bg-brand-blue/15 text-foreground"
                      : "border-border bg-surface/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${activeMode ? "text-brand-blue" : ""}`}
                  />
                  {m === "send" ? "Send Link" : "Verify"}
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                <Mail className="h-3.5 w-3.5 text-brand-blue" /> Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@gmail.com"
                className="glass-soft w-full rounded-xl px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-brand-blue/60 focus:ring-2 focus:ring-brand-blue/25"
              />
            </label>

            {mode === "verify" && (
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                  <Link2 className="h-3.5 w-3.5 text-brand-purple" /> Magic Link
                </span>
                <textarea
                  required
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  rows={3}
                  placeholder="https://alight..."
                  className="glass-soft w-full rounded-xl px-4 py-3 font-mono text-[13px] outline-none transition placeholder:text-muted-foreground focus:border-brand-purple/60 focus:ring-2 focus:ring-brand-purple/25"
                />
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                </>
              ) : mode === "send" ? (
                <>Send Magic Link</>
              ) : (
                <>Verify &amp; Activate Premium</>
              )}
            </button>
          </form>

          {result && !verified && (
            <div
              className={`glass-soft mt-6 rounded-xl p-4 text-sm ${
                result.success ? "border-brand-green/30" : "border-destructive/40"
              }`}
              style={{ animation: "step-in 0.4s ease-out both" }}
            >
              <div className="mb-2 flex items-center gap-2 font-medium">
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-brand-green" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                {result.message || (result.success ? "Success" : "Failed")}
              </div>
              {result.instructions && (
                <ol className="mt-2 list-inside list-decimal space-y-1 text-[13px] text-muted-foreground">
                  {result.instructions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              )}
              {result.error != null && (
                <pre className="mt-2 overflow-auto rounded-lg border border-border bg-surface-2/60 p-2 font-mono text-xs text-muted-foreground">
                  {typeof result.error === "string"
                    ? result.error
                    : JSON.stringify(result.error, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {verified && (
          <SuccessFlow
            {...(result?.email ? { email: result.email } : {})}
            {...(result?.duration ? { duration: result.duration } : {})}
          />
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { c: "text-brand-blue", bg: "bg-brand-blue/15", t: "Magic link", d: "Login tanpa password" },
            { c: "text-brand-amber", bg: "bg-brand-amber/15", t: "Premium 1 Tahun", d: "Aktivasi penuh" },
            { c: "text-brand-purple", bg: "bg-brand-purple/15", t: "Aman", d: "Token & PoW terverifikasi" },
          ].map((f) => (
            <div key={f.t} className="glass-soft rounded-2xl p-4">
              <span
                className={`mb-3 flex h-8 w-8 items-center justify-center rounded-full ${f.bg} ${f.c}`}
              >
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="text-sm font-medium">{f.t}</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-5 py-6 text-[13px] text-muted-foreground">
          Dev: <span className="text-foreground">SANN404 FORUM GROUP</span>
        </div>
      </footer>
    </div>
  );
}


