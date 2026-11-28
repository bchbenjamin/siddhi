import type { Metadata } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/source-sans-3";
import "@fontsource/space-mono/400.css";
import "../src/styles/globals.css";
import { NavBar } from "../src/components/NavBar";
import { Footer } from "../src/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "Siddhi | IEP Tracking Platform",
    template: "%s | Siddhi",
  },
  description:
    "An Individualized Education Program tracking platform for special and inclusive schools in India.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <NavBar />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
