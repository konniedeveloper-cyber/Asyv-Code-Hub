"use client";

import Dock, { type DockItemData } from "@/components/Dock";
import {
  CircleUserRound,
  Compass,
  House,
  Info,
  Moon,
  Plus,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

const DESTINATIONS = [
  { label: "Home", href: "/", icon: House },
  { label: "Explore projects", href: "/projects", icon: Compass },
  { label: "Post a project", href: "/submit", icon: Plus },
  { label: "About the hub", href: "/about", icon: Info },
  { label: "Account", href: "/login", icon: CircleUserRound },
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
    ...DESTINATIONS.map(({ label, href, icon: Icon }) => ({
      label,
      icon: <Icon aria-hidden="true" />,
      active:
        href === "/"
          ? pathname === "/"
          : pathname === href || pathname.startsWith(`${href}/`),
      onClick: () => router.push(href),
    })),
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
        gap={8}
        distance={150}
        showLabels
        showIndicators
        className="z-50"
        style={{ position: "fixed" }}
      />
    </nav>
  );
}
