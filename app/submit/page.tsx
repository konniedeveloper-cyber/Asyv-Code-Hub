import { ProjectSubmitForm } from "@/components/projects/project-submit-form";
import { createMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Post a project",
  description: "Share a project with the Asyv School community.",
  path: "/submit",
});

export default function SubmitProjectPage(): ReactNode {
  return (
    <main id="main-content" className="flex flex-1 flex-col pb-28">
      <section className="mx-auto w-full max-w-4xl px-6 pt-28 sm:px-10 sm:pt-36">
        <p className="text-foreground/55 mb-3 text-sm font-medium tracking-[0.16em] uppercase">
          Share your work
        </p>
        <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Post a project
        </h1>
        <p className="text-foreground/65 mt-4 max-w-2xl text-lg leading-relaxed">
          Share a project link or upload your HTML, CSS, and JavaScript files.
          Add extra pages such as contact.html, then preview the published
          project. New submissions appear publicly after admin approval.
        </p>
        <div className="mt-9">
          <ProjectSubmitForm />
        </div>
      </section>
    </main>
  );
}
