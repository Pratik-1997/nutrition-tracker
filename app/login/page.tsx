"use client";

import { useState } from "react";
import { signIn, signUp } from "@/app/actions/auth";
import Link from "next/link";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result =
      mode === "login"
        ? await signIn(formData)
        : await signUp(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100/60 overflow-hidden">
          <div className="px-8 pt-10 pb-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-emerald-700 font-semibold text-lg mb-6"
            >
              <span className="text-2xl">🥗</span>
              Nutrition Tracker
            </Link>
            <div className="flex rounded-lg bg-emerald-50/80 p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  mode === "login"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-emerald-600 hover:text-emerald-700"
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  mode === "signup"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-emerald-600 hover:text-emerald-700"
                }`}
              >
                Create account
              </button>
            </div>

            <form action={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-700 mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-shadow"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-zinc-700 mb-1"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-shadow"
                />
                {mode === "signup" && (
                  <p className="mt-1 text-xs text-zinc-500">
                    At least 6 characters
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
              >
                {mode === "login" ? "Log in" : "Create account"}
              </button>
            </form>
          </div>
          <p className="text-center text-xs text-zinc-500 pb-6 pt-2">
            By continuing, you agree to our terms of use.
          </p>
        </div>
      </div>
    </div>
  );
}
