interface Props {
  className?: string;
}

export function InlineDots({ className }: Props) {
  return (
    <span className={`inline-dots${className ? ` ${className}` : ""}`}>
      <span style={{ animationDelay: "0s" }} />
      <span style={{ animationDelay: "0.15s" }} />
      <span style={{ animationDelay: "0.30s" }} />
    </span>
  );
}
