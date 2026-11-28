import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-container footer-inner">
        <div>
          <p className="footer-wordmark">Siddhi</p>
          <p className="footer-copy">
            An Individualized Education Program tracking platform.
          </p>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/ngo">Réussir Trust</Link>
          <Link href="/about">About Us</Link>
        </nav>
      </div>
    </footer>
  );
}
