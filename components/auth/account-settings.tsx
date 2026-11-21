"use client";

import { isRecord, readError, readUser } from "@/lib/parse";
import type { PublicUser } from "@/lib/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";

async function readDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not read the image."));
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

async function compressProfileImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Choose a PNG, JPEG, or WebP image.");
  }
  if (file.size > 5_000_000) {
    throw new Error("Choose an image smaller than 5 MB.");
  }

  const image = new Image();
  image.src = await readDataUrl(file);
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("The selected file is not a valid image."));
  });

  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the profile image.");

  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(
    image,
    (size - width) / 2,
    (size - height) / 2,
    width,
    height
  );

  for (const quality of [0.82, 0.68, 0.55]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    );
    if (!blob) throw new Error("Could not prepare the profile image.");
    if (blob.size <= 250_000) return readDataUrl(blob);
  }
  throw new Error("The profile image is too large after compression.");
}

export function AccountSettings(): ReactNode {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingImage, setSavingImage] = useState(false);

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

  async function loadProfileImage(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setSavingImage(true);
    setError(null);
    try {
      const profileImage = await compressProfileImage(file);
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImage }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(readError(data, "Could not update your profile image."));
        return;
      }
      if (!isRecord(data) || !readUser(data)) {
        setError("The profile image update returned an unexpected response.");
        return;
      }
      setUser(readUser(data));
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "Could not update your profile image."
      );
    } finally {
      setSavingImage(false);
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
          <div className="mt-4 flex items-center gap-4">
            <div className="border-foreground/10 bg-foreground/5 relative h-20 w-20 shrink-0 overflow-hidden rounded-full border">
              {user.profileImage ? (
                <NextImage
                  src={user.profileImage}
                  alt={`${user.name} profile`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-xl font-semibold">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <label className="focus-ring border-foreground/10 hover:bg-foreground/5 inline-flex min-h-10 cursor-pointer items-center rounded-lg border px-3 text-sm font-medium">
                {savingImage ? "Saving..." : "Upload profile picture"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={savingImage}
                  onChange={(event) => void loadProfileImage(event)}
                  className="sr-only"
                />
              </label>
              <p className="text-foreground/55 mt-2 text-xs">
                PNG, JPEG, or WebP. 5 MB maximum.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium">{user.name}</p>
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
