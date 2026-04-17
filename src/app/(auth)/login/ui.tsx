"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingSpinner } from "@/components/loading-spinner";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  return (
    <div className="stack card">
      <div className="row">
        <button type="button" className={mode === "signin" ? "primary" : ""} onClick={() => setMode("signin")}>
          Sign in
        </button>
        <button type="button" className={mode === "signup" ? "primary" : ""} onClick={() => setMode("signup")}>
          Sign up
        </button>
      </div>

      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const fd = new FormData(e.currentTarget);
          const email = String(fd.get("email") ?? "");
          const password = String(fd.get("password") ?? "");
          start(async () => {
            if (mode === "signup") {
              const { error: err } = await supabase.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
              });
              if (err) setError(err.message);
              else router.replace("/");
              return;
            }
            const { error: err } = await supabase.auth.signInWithPassword({ email, password });
            if (err) setError(err.message);
            else {
              const next = searchParams.get("next") ?? "/";
              router.replace(next);
              router.refresh();
            }
          });
        }}
      >
        <label className="stack">
          <span className="small muted">Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="stack">
          <span className="small muted">Password</span>
          <input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
        </label>
        {error ? <div className="error small">{error}</div> : null}
        <button className="primary" type="submit" disabled={pending} aria-busy={pending}>
          <span className="btn-with-spinner">
            {pending ? <LoadingSpinner size="sm" decorative /> : null}
            {pending ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
          </span>
        </button>
      </form>

    </div>
  );
}
