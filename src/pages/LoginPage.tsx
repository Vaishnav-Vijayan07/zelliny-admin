import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { signIn } from "@/lib/api/sections.functions";
import { writeSession } from "@/hooks/use-session";
import { TEAM_ACCOUNTS, initialsOf } from "@/lib/api/team-accounts";

export default function LoginPage() {
  const navigate = useNavigate();
  const doSignIn = useServerFn(signIn);
  const [email, setEmail] = useState("ramy.bakr@zelliny.com");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Enter your email or username and password");
    setBusy(true);
    try {
      const res = await doSignIn({ data: { email, password } });
      if (!res.ok) return setError(res.error);
      writeSession(res.user);
      toast(`Welcome back, ${res.user.name.split(" ")[0]}`);
      await navigate({ to: "/" });
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-2">
      <div className="flex flex-col px-8 py-8 md:px-16">
        <div className="flex items-baseline gap-3">
          <span className="font-head text-lg tracking-[.35em]">ZELLINY</span>
          <span className="text-[10px] tracking-[.2em] text-muted-foreground">ADMIN</span>
        </div>
        <form onSubmit={submit} className="my-auto w-full max-w-sm space-y-5 py-12">
          <div>
            <p className="text-[11px] uppercase tracking-[.2em] text-muted-foreground">House of Zelliny</p>
            <h1 className="mt-2 text-[34px]">Welcome back</h1>
            <p className="mt-1 text-muted-foreground">Sign in to manage Zelliny.com.</p>
          </div>
          <label className="block text-[13px]">Email or username
            <input type="text" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255}
              className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-3 outline-none focus:border-primary" />
          </label>
          <label className="block text-[13px]">Password
            <div className="mt-1.5 flex h-11 rounded-lg border border-border bg-surface focus-within:border-primary">
              <input type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 outline-none" />
              <button type="button" onClick={() => setShow(!show)} className="px-3 text-[12px] text-muted-foreground hover:text-foreground">{show ? "Hide" : "Show"}</button>
            </div>
          </label>
          {error && <p className="text-[13px] text-bad">{error}</p>}
          <label className="flex items-center gap-2 text-[13px] text-muted-foreground"><input type="checkbox" defaultChecked /> Keep me signed in on this device</label>
          <p className="text-[12px] text-muted-foreground">Demo access — pick an account below, password <b className="text-foreground">zelliny123</b></p>
          <button type="button" disabled={busy} onClick={submit} className="h-11 w-full rounded-lg bg-primary text-[14px] text-primary-foreground disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>

          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 text-[11px] uppercase tracking-[.15em] text-muted-foreground">Prototype · sample team accounts</div>
            <div className="space-y-1">
              {TEAM_ACCOUNTS.map((a) => {
                const on = email.trim().toLowerCase() === a.email || email.trim().toLowerCase() === a.username;
                return (
                  <button key={a.username} type="button" onClick={() => { setEmail(a.email); setError(""); }}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${on ? "bg-accent" : "hover:bg-muted"}`}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">{initialsOf(a.name)}</span>
                    <span className="min-w-0">
                      <b className="block text-[13px] font-medium">{a.name}</b>
                      <span className="block text-[11.5px] text-muted-foreground">Username: {a.username} · {a.role}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11.5px] text-muted-foreground">Every person has their own login. What they change is recorded under their name in the Activity log.</p>
          </div>
        </form>
        <div className="flex flex-wrap justify-between gap-2 text-[11.5px] text-muted-foreground">
          <span>Protected area · every sign-in is recorded in the Activity log</span>
          <span>© 2026 Zelliny for Gifts and Luxury Products</span>
        </div>
      </div>
      <div className="relative hidden items-end bg-primary p-12 text-primary-foreground lg:flex">
        <div>
          <small className="text-[11px] tracking-[.2em] opacity-70">HOUSE OF ZELLINY</small>
          <p className="mt-2 font-head text-[32px]">A gift to remember.</p>
          <p className="mt-2 max-w-sm opacity-80">Fragrance, beauty, jewellery, watches and the finest accessories — curated in Cairo.</p>
        </div>
      </div>
    </div>
  );
}
