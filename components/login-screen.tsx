"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Pill } from "lucide-react";
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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-[400px] rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-800 text-white">
            <Pill className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">MedQuote</h1>
              {isDemo ? (
                <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  Mode Demo
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Masuk untuk mengelola penawaran harga.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <Field label="Email" htmlFor="login-email">
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(error)}
            />
          </Field>
          <Field label="Password" htmlFor="login-password">
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(error)}
            />
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
            <LockKeyhole className="h-4 w-4" />
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>

        {isDemo ? (
          <p className="mt-5 border-t border-slate-100 pt-4 text-center text-xs leading-5 text-slate-500">
            Data demo tersimpan di perangkat ini agar seluruh alur dapat dicoba
            tanpa konfigurasi tambahan.
          </p>
        ) : null}
      </section>
    </main>
  );
}
