"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { portalErrorMessage } from "../lib/errors";
import {
  LOGIN_EMAIL_PLACEHOLDER,
  LOGIN_PASSWORD_PLACEHOLDER,
  LOGIN_SUBMIT_LABEL,
  LOGIN_SUBTITLE,
  LOGIN_TITLE,
  REGTEST_BANNER,
  REGTEST_BANNER_DETAIL,
  validateLoginFields,
} from "../lib/loginForm";
import { ADMIN_HOME_HREF } from "../lib/nav";
import { useAuth } from "./AuthProvider";

export function LoginForm() {
  const router = useRouter();
  const { login, error: sessionError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const invalid = validateLoginFields(email, password);
    if (invalid) {
      setError(invalid);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.replace(ADMIN_HOME_HREF);
    } catch (err) {
      setError(portalErrorMessage(err, 0));
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-stage bg-surface px-4 py-4">
      <div className="w-full max-w-xl">
        <section className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="rounded-xl bg-blue-low p-1.5">
              <img src="/Logo_SmartPay_Africa.png" alt="SmartPay Africa" width={72} height={72} className="h-16 w-16 object-contain" />
            </div>
            <h1 className="mt-2.5 font-display text-lg font-semibold text-navy">{LOGIN_TITLE}</h1>
            <p className="mt-0.5 max-w-md text-sm leading-5 text-muted">{LOGIN_SUBTITLE}</p>
          </div>

          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-2 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-orange">{REGTEST_BANNER}</p>
            <p className="mt-0.5 text-sm leading-5 text-navy">{REGTEST_BANNER_DETAIL}</p>
          </div>

          <form className="flex flex-col gap-3" onSubmit={(event) => void onSubmit(event)} noValidate>
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Adresse e-mail administrateur</span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={LOGIN_EMAIL_PLACEHOLDER}
                className="h-12 rounded-xl bg-blue-low px-4 text-sm text-navy outline-none ring-orange focus:bg-white focus:ring-2"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Mot de passe administrateur</span>
              <span className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={LOGIN_PASSWORD_PLACEHOLDER}
                  className="h-12 w-full rounded-xl bg-blue-low px-4 pr-24 text-sm text-navy outline-none ring-orange focus:bg-white focus:ring-2"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </span>
            </label>
            {error || sessionError ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
                {error ?? sessionError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="flex h-[52px] items-center justify-center rounded-xl bg-orange text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Connexion…" : LOGIN_SUBMIT_LABEL}
            </button>
          </form>
        </section>
        <p className="mt-3 text-center text-xs text-muted">
          SmartPay Africa · Dakar Bitcoin Hack 2026 · banc d&apos;essai isolé
        </p>
      </div>
    </main>
  );
}
