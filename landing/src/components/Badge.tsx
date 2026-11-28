import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  surface?: "light" | "dark";
  className?: string;
};

export function Badge({ children, surface = "dark", className = "" }: BadgeProps) {
  return <span className={`badge badge--${surface} ${className}`.trim()}>{children}</span>;
}
