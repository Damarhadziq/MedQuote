"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { Field, Input } from "./ui/field";

export function LoginScreen({
  isDemo,
  onLogin,
}: {
  isDemo: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState(isDemo ? "demo@medquote.id" : "");
  const [password, setPassword] = useState(isDemo ? "medquote" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Email dan password perlu diisi.");
      return;
    }
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Tidak dapat masuk. Periksa email dan password Anda.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="relative flex min-h-screen items-center bg-cover bg-center p-4 sm:p-8"
      style={{ backgroundImage: "url('/login-background.jpg')" }}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-slate-950/35" />
      <div className="relative mx-auto flex w-full max-w-[1440px] justify-center">
        <section className="w-full max-w-[400px] rounded-lg border border-border bg-white p-6 sm:p-8">
          <div className="mb-7">
            <h1 className="text-xl font-semibold text-slate-900">MedQuote</h1>
            <p className="mt-1 text-sm text-slate-500">
              Masuk untuk mengelola penawaran harga.
            </p>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <Field label="Email" htmlFor="login-email">
              <Input
                id="login-email"
                placeholder="nama@email.com"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
              />
            </Field>
            <Field label="Password" htmlFor="login-password">
              <div className="relative">
                <Input
                  id="login-password"
                  placeholder="Masukkan password"
                  className="pr-11"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error)}
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </Field>

            {error ? (
              <div
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <Button className="w-full" type="submit" loading={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}