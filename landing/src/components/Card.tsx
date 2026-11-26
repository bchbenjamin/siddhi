import type { ReactNode } from "react";

type CardTone = "light" | "peach" | "dark";

type CardProps = {
  children: ReactNode;
  tone?: CardTone;
  className?: string;
};

export function Card({ children, tone = "light", className = "" }: CardProps) {
  return <article className={`card card--${tone} ${className}`.trim()}>{children}</article>;
}
