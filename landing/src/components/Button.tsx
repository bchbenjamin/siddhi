import type { AnchorHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "nav";

type ButtonProps = {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
} & Pick<AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel" | "aria-label">;

export function Button({
  href,
  variant = "primary",
  children,
  className = "",
  target,
  rel,
  "aria-label": ariaLabel,
}: ButtonProps) {
  return (
    <a
      className={`button button--${variant} ${className}`.trim()}
      href={href}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}
