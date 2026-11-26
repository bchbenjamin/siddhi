import type { Metadata } from "next";
import { EyebrowLabel } from "../../src/components/EyebrowLabel";
import "./about.css";

export const metadata: Metadata = {
  title: "About Us",
  description: "Meet the team behind Siddhi — coming soon.",
};

export default function AboutPage() {
  return (
    <section className="about-placeholder section--dark">
      <div className="page-container about-placeholder__inner">
        <EyebrowLabel>ABOUT SIDDHI</EyebrowLabel>
        <h1>Meet the team — coming soon.</h1>
        <p>
          We are preparing this space to introduce the people behind Siddhi.
          More about the team will be shared here soon.
        </p>
        <span className="about-placeholder__index" aria-hidden="true">S / 03</span>
      </div>
    </section>
  );
}
