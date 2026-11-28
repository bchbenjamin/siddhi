import Link from "next/link";
import "./not-found.css";

export default function NotFound() {
  return (
    <section className="not-found section--dark">
      <div className="page-container not-found__inner">
        <p className="eyebrow">404 / PAGE NOT FOUND</p>
        <h1>This page isn't here.</h1>
        <p className="not-found__description">
          The page may have moved, or the address may be incorrect.
        </p>
        <Link className="button button--nav" href="/">
          Back to Siddhi
        </Link>
      </div>
    </section>
  );
}
