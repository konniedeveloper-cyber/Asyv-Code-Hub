"use client";

import Dock, { type DockItemData } from "@/components/Dock";
import { Compass, House, Info, Moon, Plus, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

const DESTINATIONS = [
  { label: "Home", href: "/", icon: House },
  { label: "Explore projects", href: "/projects", icon: Compass },
  { label: "Post a project", href: "/submit", icon: Plus },
  { label: "About the hub", href: "/about", icon: Info },
] as const;

export function Nav(): ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

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
      label: "Settings",
      icon: <Settings aria-hidden="true" />,
      active: pathname === "/settings" || pathname.startsWith("/settings/"),
      badge: true,
      onClick: () => router.push("/settings"),
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
