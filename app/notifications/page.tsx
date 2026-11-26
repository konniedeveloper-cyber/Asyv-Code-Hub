import { NotificationCenter } from "@/components/notifications/notification-center";
import { createMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Notifications",
  description:
    "See project reviews and updates for your Asyv Code Hub account.",
  path: "/notifications",
});

export default function NotificationsPage(): ReactNode {
  return (
    <main id="main-content" className="flex flex-1 flex-col pb-28">
      <section className="mx-auto w-full max-w-4xl px-6 pt-28 sm:px-10 sm:pt-36">
        <p className="text-foreground/55 mb-3 text-sm font-medium tracking-[0.16em] uppercase">
          Your updates
        </p>
        <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Notifications
        </h1>
        <p className="text-foreground/65 mt-4 max-w-2xl text-lg leading-relaxed">
          Stay up to date with project approvals, admin feedback, and account
          updates.
        </p>
        <NotificationCenter />
      </section>
    </main>
  );
}
