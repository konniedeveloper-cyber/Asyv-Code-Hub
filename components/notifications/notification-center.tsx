"use client";

import { isRecord, readError } from "@/lib/parse";
import type { UserNotification } from "@/lib/types";
import { LoadingIndicator, Skeleton } from "@/components/ui/loading";
import { Bell, CircleCheck, CircleX, RotateCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

function isNotification(value: unknown): value is UserNotification {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.type === "project-approved" ||
      value.type === "project-rejected" ||
      value.type === "project-deleted") &&
    typeof value.title === "string" &&
    typeof value.message === "string" &&
    typeof value.href === "string" &&
    typeof value.read === "boolean" &&
    typeof value.createdAt === "string"
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function NotificationIcon({
  type,
}: {
  type: UserNotification["type"];
}): ReactNode {
  const Icon =
    type === "project-approved"
      ? CircleCheck
      : type === "project-rejected"
        ? CircleX
        : Trash2;
  return <Icon aria-hidden="true" className="h-5 w-5" />;
}

export function NotificationCenter(): ReactNode {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/notifications", { cache: "no-store" })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!active) return;
        if (!response.ok) {
          setError(readError(data, "Could not load notifications."));
          return;
        }
        if (
          !isRecord(data) ||
          !Array.isArray(data.notifications) ||
          !data.notifications.every(isNotification) ||
          typeof data.unreadCount !== "number"
        ) {
          setError("The notification list returned an unexpected response.");
          return;
        }
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {
        if (active) {
          setError("Could not load notifications. Check your connection.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  async function markAllRead(): Promise<void> {
    if (saving || unreadCount === 0) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(readError(data, "Could not update notifications."));
        return;
      }
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
      window.dispatchEvent(new Event("asyv:notifications-updated"));
    } catch {
      setError("Could not update notifications. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  function retry(): void {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  return (
    <section className="mt-8">
      {error ? (
        <div
          role="alert"
          className="border-foreground/10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
        >
          <div>
            <p className="text-sm">{error}</p>
            {error === "Sign in to view notifications." ? (
              <Link
                href="/login"
                className="mt-2 inline-flex text-sm font-medium underline underline-offset-2"
              >
                Sign in
              </Link>
            ) : null}
          </div>
          {error !== "Sign in to view notifications." ? (
            <button
              type="button"
              onClick={retry}
              className="focus-ring hover:bg-foreground/5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
            >
              <RotateCw aria-hidden="true" className="h-4 w-4" />
              Retry
            </button>
          ) : null}
        </div>
      ) : loading ? (
        <div
          role="status"
          aria-label="Loading notifications"
          aria-busy="true"
          className="grid gap-3"
        >
          <span className="sr-only">Loading notifications</span>
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="border-foreground/10 grid gap-3 rounded-2xl border p-5"
            >
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="border-foreground/15 rounded-2xl border border-dashed px-6 py-12 text-center">
          <Bell
            aria-hidden="true"
            className="text-foreground/40 mx-auto h-8 w-8"
          />
          <h2 className="mt-4 text-lg font-medium">
            You&apos;re all caught up
          </h2>
          <p className="text-foreground/60 mt-2 text-sm">
            Project reviews and other updates will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-foreground/60 text-sm" aria-live="polite">
              {unreadCount === 0
                ? "All notifications read"
                : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
            </p>
            <button
              type="button"
              disabled={saving || unreadCount === 0}
              onClick={() => void markAllRead()}
              className="focus-ring hover:bg-foreground/5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? (
                <LoadingIndicator label="Marking as read" />
              ) : (
                "Mark all as read"
              )}
            </button>
          </div>
          <ul className="grid gap-3">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link
                  href={notification.href}
                  className={`focus-ring border-foreground/10 hover:bg-foreground/[0.03] grid grid-cols-[auto_1fr_auto] items-start gap-4 rounded-2xl border p-5 ${
                    notification.read ? "bg-background" : "bg-foreground/[0.03]"
                  }`}
                >
                  <span
                    className={`mt-0.5 ${
                      notification.type === "project-approved"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : notification.type === "project-rejected"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    <NotificationIcon type={notification.type} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {notification.title}
                    </span>
                    <span className="text-foreground/65 mt-1 block text-sm leading-relaxed">
                      {notification.message}
                    </span>
                    <time
                      dateTime={notification.createdAt}
                      className="text-foreground/45 mt-2 block text-xs"
                    >
                      {formatDate(notification.createdAt)}
                    </time>
                  </span>
                  {!notification.read ? (
                    <span
                      aria-label="Unread"
                      className="bg-ring mt-2 h-2.5 w-2.5 rounded-full"
                    />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
