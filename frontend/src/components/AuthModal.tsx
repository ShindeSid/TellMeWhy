import { useState } from "react";

import { IconClose } from "@/components/icons";
import { useAuthStore } from "@/store/useAuthStore";

export function AuthModal({
  onClose,
  initialMode = "login",
}: {
  onClose: () => void;
  initialMode?: "login" | "signup";
}) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = mode === "login" ? await login(email, password) : await signup(email, password);
    if (ok) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? "Sign in" : "Create an account"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{mode === "login" ? "Sign in" : "Create an account"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded p-0.5 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:text-neutral-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
            />
            {mode === "signup" && <span className="text-xs text-neutral-400 dark:text-neutral-500">At least 8 characters.</span>}
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-indigo-700 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isLoading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            clearError();
            setMode(mode === "login" ? "signup" : "login");
          }}
          className="cursor-pointer text-sm text-neutral-500 dark:text-neutral-400 underline hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
