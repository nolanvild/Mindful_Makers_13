"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "error" | "info" } | null>(
    null,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setMsg({ text: error.message, kind: "error" });
        } else if (data.session) {
          // Email confirmation off → session is live immediately.
          router.push("/");
          router.refresh();
          return;
        } else {
          setMsg({
            text: "Check your email to confirm your account, then sign in.",
            kind: "info",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setMsg({ text: error.message, kind: "error" });
        } else {
          router.push("/");
          router.refresh();
          return;
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="phone">
      <div className="auth-screen">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="auth-logo" src="/branchout.png" alt="Branch Out" />
        <p className="auth-sub">
          {isLogin ? "Sign in to your garden" : "Create your account"}
        </p>

        <form className="auth-form" onSubmit={submit}>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {msg && (
            <p className={msg.kind === "error" ? "auth-error" : "auth-info"}>
              {msg.text}
            </p>
          )}
          <button type="submit" disabled={busy}>
            {busy ? "…" : isLogin ? "Sign in" : "Sign up"}
          </button>
        </form>

        <p className="auth-toggle">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setMode(isLogin ? "signup" : "login");
              setMsg(null);
            }}
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
