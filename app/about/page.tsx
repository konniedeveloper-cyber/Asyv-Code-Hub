import { createMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "About the hub",
  description:
    "A place for Asyv School students to share and explore projects.",
  path: "/about",
});

export default function AboutPage(): ReactNode {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pt-28 pb-28 sm:px-10 sm:pt-36"
    >
      <p className="text-foreground/55 mb-3 text-sm font-medium tracking-[0.16em] uppercase">
        Built for Asyv School
      </p>
      <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
        A place to share what you make.
      </h1>
      <p className="text-foreground/65 mt-5 max-w-2xl text-lg leading-relaxed">
        Asyv Code Hub helps students publish their projects, discover what
        classmates are building, and give each other feedback through likes.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Share a link",
            description: "Post a project that is already hosted online.",
          },
          {
            title: "Preview code",
            description:
              "Add HTML, CSS, and JavaScript files and preview them safely.",
          },
          {
            title: "Support others",
            description: "Explore student work and like projects you enjoy.",
          },
        ].map((feature) => (
          <article
            key={feature.title}
            className="border-foreground/10 rounded-2xl border p-5"
          >
            <h2 className="font-semibold">{feature.title}</h2>
            <p className="text-foreground/65 mt-2 text-sm leading-relaxed">
              {feature.description}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
