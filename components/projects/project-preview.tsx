"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function ProjectPreview({ projectId }: { projectId: string }): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function syncFullscreen(): void {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  async function toggleFullscreen(): Promise<void> {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
      setError(null);
    } catch {
      setError("Could not change the preview fullscreen mode.");
    }
  }

  return (
    <div ref={containerRef} className="project-preview-container">
      <div className="flex items-center justify-between gap-3">
        <p className="text-foreground/60 text-sm">HTML project preview</p>
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          aria-label={isFullscreen ? "Exit fullscreen preview" : "Expand preview to fullscreen"}
          title={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
          className="focus-ring hover:bg-foreground/5 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
        >
          {isFullscreen ? (
            <Minimize2 aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Maximize2 aria-hidden="true" className="h-4 w-4" />
          )}
          <span>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</span>
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      ) : null}
      <iframe
        title="Project preview"
        src={`/api/projects/${encodeURIComponent(projectId)}/preview/`}
        sandbox="allow-scripts"
        className="border-foreground/10 h-[75vh] min-h-120 w-full rounded-2xl border bg-white"
      />
    </div>
  );
}
