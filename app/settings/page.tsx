import { AccountSettings } from "@/components/auth/account-settings";
import { createMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Settings",
  description: "Manage your Asyv Code Hub profile settings.",
  path: "/settings",
});

export default function SettingsPage(): ReactNode {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pt-28 pb-28 sm:px-10 sm:pt-36"
    >
      <p className="text-foreground/55 mb-3 text-sm font-medium tracking-[0.16em] uppercase">
        Your account
      </p>
      <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
        Settings
      </h1>
      <AccountSettings />
    </main>
  );
}
