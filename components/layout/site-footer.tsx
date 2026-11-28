import type { ReactNode } from "react";

export function SiteFooter(): ReactNode {
  return (
    <footer className="site-footer" aria-label="Site credits">
      <p className="sr-only">
        Built by Konnie. © 2026 Asyv Code Hub. For the Asyv community.
      </p>
      <div className="site-footer__row" aria-hidden="true">
        <span className="site-footer__built">built by konnie</span>
        <span className="site-footer__copyright">© 2026 Asyv Code Hub</span>
        <span className="site-footer__community">for the asyv community</span>
      </div>
    </footer>
  );
}
