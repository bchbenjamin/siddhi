type EyebrowLabelProps = {
  children: string;
  className?: string;
};

export function EyebrowLabel({ children, className = "" }: EyebrowLabelProps) {
  return <p className={`eyebrow ${className}`.trim()}>{children}</p>;
}
