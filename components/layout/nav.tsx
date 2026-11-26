"use client";

import Dock, { type DockItemData } from "@/components/Dock";
import {
  Code2,
  Compass,
  Bell,
  House,
  Info,
  Moon,
  Plus,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { isRecord, readUser } from "@/lib/parse";

const DESTINATIONS = [
  { label: "Home", href: "/", icon: House },
  { label: "Explore projects", href: "/projects", icon: Compass },
  { label: "My projects", href: "/my-projects", icon: Code2 },
  { label: "Post a project", href: "/submit", icon: Plus },
] as const;

export function Nav(): ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [isStudent, setIsStudent] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationCountError, setNotificationCountError] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    let active = true;
    async function refreshUser(): Promise<void> {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data: unknown = await response.json();
        const user = readUser(data);
        if (active) setIsStudent(response.ok && user?.role === "student");
      } catch {
        if (active) setIsStudent(false);
      }
    }

    void refreshUser();
    const interval = window.setInterval(() => void refreshUser(), 60_000);
    window.addEventListener("focus", refreshUser);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshUser);
    };
  }, [pathname]);

  useEffect(() => {
    if (!isStudent) return;

    let active = true;
    async function refreshNotifications(): Promise<void> {
      try {
        const response = await fetch("/api/notifications?summary=1", {
          cache: "no-store",
        });
        if (!response.ok) {
          if (active) setNotificationCountError(true);
          return;
        }
        const data: unknown = await response.json();
        if (!isRecord(data) || typeof data.unreadCount !== "number") {
          if (active) setNotificationCountError(true);
          return;
        }
        if (!active) return;
        setUnreadCount(data.unreadCount);
        setNotificationCountError(false);
      } catch {
        if (active) setNotificationCountError(true);
      }
    }

    void refreshNotifications();
    const interval = window.setInterval(
      () => void refreshNotifications(),
      30_000
    );
    window.addEventListener("focus", refreshNotifications);
    window.addEventListener("asyv:notifications-updated", refreshNotifications);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshNotifications);
      window.removeEventListener(
        "asyv:notifications-updated",
        refreshNotifications
      );
    };
  }, [isStudent, pathname]);

  const items: DockItemData[] = [
    ...DESTINATIONS.map((item) => {
      const { label, href, icon: Icon } = item;
      return {
        label,
        icon: <Icon aria-hidden="true" />,
        active:
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`),
        onClick: () => router.push(href),
      };
    }),
    ...(isStudent
      ? [
          {
            label: notificationCountError
              ? "Notifications (unread count unavailable)"
              : unreadCount > 0
                ? `Notifications (${unreadCount} unread)`
                : "Notifications",
            icon: <Bell aria-hidden="true" />,
            active:
              pathname === "/notifications" ||
              pathname.startsWith("/notifications/"),
            badge:
              unreadCount > 0
                ? unreadCount > 99
                  ? "99+"
                  : unreadCount
                : notificationCountError
                  ? true
                  : undefined,
            onClick: () => router.push("/notifications"),
          },
        ]
      : []),
    {
      label: "Settings",
      icon: <Settings aria-hidden="true" />,
      active: pathname === "/settings" || pathname.startsWith("/settings/"),
      badge: true,
      onClick: () => router.push("/settings"),
    },
    {
      label:
        mounted && resolvedTheme === "dark"
          ? "Switch to light mode"
          : "Switch to dark mode",
      icon:
        mounted && resolvedTheme === "dark" ? (
          <Sun aria-hidden="true" />
        ) : (
          <Moon aria-hidden="true" />
        ),
      onClick: () =>
        setTheme(mounted && resolvedTheme === "dark" ? "light" : "dark"),
    },
    { separator: true },
    {
      label: "About the hub",
      icon: <Info aria-hidden="true" />,
      active: pathname === "/about" || pathname.startsWith("/about/"),
      onClick: () => router.push("/about"),
    },
    {
      label: "Sign in / Sign up",
      icon: <UserRound aria-hidden="true" />,
      active: pathname === "/login",
      onClick: () => router.push("/login"),
    },
  ];

  return (
    <nav aria-label="Primary">
      <Dock
        items={items}
        position="bottom"
        theme="dark"
        baseItemSize={48}
        magnification={62}
        panelHeight={66}
        gap={7}
        distance={150}
        showLabels
        showIndicators
        badgeColor="#ff453a"
        className="z-50"
        style={{ position: "fixed" }}
      />
    </nav>
  );
}
