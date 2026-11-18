"use client";

import { isRecord, readError, readUser } from "@/lib/parse";
import type { PublicUser } from "@/lib/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

export function AccountSettings(): ReactNode {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!active) return;
        if (!response.ok) {
          setError(readError(data, "Could not load your account."));
          return;
        }
        if (!isRecord(data) || (data.user !== null && !readUser(data))) {
          setError("The account response was invalid.");
          return;
        }
        setUser(readUser(data));
      })
      .catch(() => {
        if (active) setError("Could not load your account. Try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function logOut(): Promise<void> {
    if (loggingOut) return;
    setLoggingOut(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(readError(data, "Could not log out."));
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Could not log out. Check your connection and try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <section className="border-foreground/10 mt-8 rounded-2xl border p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Account</h2>
      {loading ? (
        <p role="status" className="text-foreground/60 mt-3 text-sm">
          Loading account…
        </p>
      ) : user ? (
        <>
          <p className="mt-3 text-sm font-medium">{user.name}</p>
          <p className="text-foreground/60 mt-1 text-sm">{user.email}</p>
          <p className="text-foreground/50 mt-2 text-xs capitalize">
            Role: {user.role}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/my-projects"
              className="focus-ring border-foreground/10 hover:bg-foreground/5 rounded-xl border px-4 py-2.5 text-sm font-medium"
            >
              My projects
            </Link>
            {user.role === "admin" ? (
              <Link
                href="/admin"
                className="focus-ring border-foreground/10 hover:bg-foreground/5 rounded-xl border px-4 py-2.5 text-sm font-medium"
              >
                Admin dashboard
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void logOut()}
              disabled={loggingOut}
              className="focus-ring bg-foreground text-background rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-3">
          <p className="text-foreground/60 text-sm">You are not signed in.</p>
          <Link
            href="/login"
            className="focus-ring mt-3 inline-flex rounded-lg px-2 py-1 text-sm font-medium underline underline-offset-2"
          >
            Sign in
          </Link>
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </section>
  );
}
