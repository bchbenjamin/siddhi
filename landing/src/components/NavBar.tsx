"use client";

import { useState } from "react";
import Link from "next/link";
import { SIDDHI_PLATFORM_URL } from "../config";
import { Button } from "./Button";

const navigationLinks = [
  { href: "/", label: "Home" },
  { href: "/ngo", label: "Réussir Trust" },
  { href: "/about", label: "About Us" },
];

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="nav-container">
        <Link className="nav-brand" href="/" aria-label="Siddhi home" onClick={closeMenu}>
          <span className="nav-brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>Siddhi</span>
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          {navigationLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          <Button href={SIDDHI_PLATFORM_URL} variant="nav">
            Sign in
          </Button>
          <button
            className="mobile-menu-button"
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      <nav
        className="mobile-nav"
        id="mobile-navigation"
        aria-label="Mobile navigation"
        data-open={menuOpen}
      >
        {navigationLinks.map((item) => (
          <Link key={item.href} href={item.href} onClick={closeMenu}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
