import Link from "next/link";
import type { ReactNode } from "react";

type ProjectPreviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPreviewPage({
  params,
}: ProjectPreviewPageProps): Promise<ReactNode> {
  const { id } = await params;

  return (
    <main id="main-content" className="flex flex-1 flex-col pb-28">
      <section className="mx-auto w-full max-w-7xl px-6 pt-28 sm:px-10 sm:pt-36">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Project preview
          </h1>
          <Link
            href="/projects"
            className="focus-ring hover:bg-foreground/5 rounded-lg px-3 py-2 text-sm font-medium"
          >
            Back to projects
          </Link>
        </div>
        <iframe
          title="Project preview"
          src={`/api/projects/${id}/preview/`}
          sandbox="allow-scripts"
          className="border-foreground/10 h-[75vh] min-h-120 w-full rounded-2xl border bg-white"
        />
      </section>
    </main>
  );
}
