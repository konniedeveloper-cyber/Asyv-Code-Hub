"use client";

import { readError, readUser } from "@/lib/parse";
import { LIMITS } from "@/lib/limits";
import SlideCommit from "@/components/SlideCommit";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";

type AuthMode = "login" | "register";

const fieldClassName =
  "focus-ring mt-2 w-full rounded-xl border border-foreground/25 bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-foreground/45 hover:border-foreground/35 focus:border-ring";

export function AuthForm(): ReactNode {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    const form = formRef.current;
    if (!form?.reportValidity()) {
      const reason = new Error("Complete the required fields first.");
      setError(reason.message);
      throw reason;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register"
            ? { mode, name, email, password }
            : { mode, email, password }
        ),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(readError(data, "Could not sign in. Try again."));
      }
      if (!readUser(data)) {
        throw new Error("The account service returned an unexpected response.");
      }
      router.push("/");
      router.refresh();
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Could not reach the account service. Check your connection.";
      setError(message);
      throw reason;
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode: AuthMode): void {
    setMode(nextMode);
    setError(null);
  }

  return (
    <div>
      <div className="bg-foreground/5 mb-6 grid grid-cols-2 rounded-xl p-1">
        <button
          type="button"
          disabled={submitting}
          aria-pressed={mode === "login"}
          onClick={() => changeMode("login")}
          className={`focus-ring rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            mode === "login" ? "bg-background shadow-sm" : "text-foreground/60"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          disabled={submitting}
          aria-pressed={mode === "register"}
          onClick={() => changeMode("register")}
          className={`focus-ring rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            mode === "register"
              ? "bg-background shadow-sm"
              : "text-foreground/60"
          }`}
        >
          Create account
        </button>
      </div>

      <form
        ref={formRef}
        onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
        className="grid gap-5"
      >
        {mode === "register" ? (
          <label className="text-sm font-medium">
            Your name
            <input
              required
              minLength={2}
              maxLength={LIMITS.name}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClassName}
            />
          </label>
        ) : null}
        <label className="text-sm font-medium">
          Email
          <input
            required
            type="email"
            maxLength={LIMITS.email}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClassName}
          />
        </label>
        <label className="text-sm font-medium">
          Password
          <input
            required
            type="password"
            minLength={LIMITS.passwordMin}
            maxLength={LIMITS.passwordMax}
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClassName}
          />
          {mode === "register" ? (
            <span className="text-foreground/55 mt-2 block text-xs font-normal">
              At least {LIMITS.passwordMin} characters.
            </span>
          ) : null}
        </label>

        {error ? (
          <p role="alert" className="bg-foreground/5 rounded-xl p-4 text-sm">
            {error}
          </p>
        ) : null}

        <div className="flex justify-center pt-1">
          <SlideCommit
            label={
              mode === "register" ? "Slide to sign up" : "Slide to sign in"
            }
            doneLabel={mode === "register" ? "Account created" : "Signed in"}
            errorLabel="Please try again"
            icon={<ArrowRight aria-hidden="true" className="h-5 w-5" />}
            onConfirm={handleConfirm}
            disabled={submitting}
            width={280}
            height={56}
            trackColor="color-mix(in srgb, var(--foreground) 12%, var(--background))"
            handleColor="var(--background)"
            successColor="#22c55e"
            dangerColor="#e5484d"
          />
        </div>
      </form>
    </div>
  );
}
