import { EyebrowLabel } from "./EyebrowLabel";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
  className = "",
}: SectionHeadingProps) {
  return (
    <div
      className={`section-heading ${centered ? "section-heading--center" : ""} ${className}`.trim()}
    >
      <EyebrowLabel>{eyebrow}</EyebrowLabel>
      <h2>{title}</h2>
      {description ? (
        <p className="section-heading__description">{description}</p>
      ) : null}
    </div>
  );
}
