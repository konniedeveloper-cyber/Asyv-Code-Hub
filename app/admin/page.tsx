import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { createMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Admin dashboard",
  description: "Review projects and manage student accounts.",
  path: "/admin",
});

export default function AdminPage(): ReactNode {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pt-28 pb-28 sm:px-10 sm:pt-36"
    >
      <p className="text-foreground/55 mb-3 text-sm font-medium tracking-[0.16em] uppercase">
        Admin only
      </p>
      <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
        Admin dashboard
      </h1>
      <p className="text-foreground/65 mt-4 max-w-2xl text-lg leading-relaxed">
        Approve or reject submissions, remove projects, and manage student
        accounts.
      </p>
      <AdminDashboard />
    </main>
  );
}
