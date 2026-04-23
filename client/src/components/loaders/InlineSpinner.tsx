interface Props {
  className?: string;
}

export function InlineSpinner({ className }: Props) {
  return <span className={`inline-spinner${className ? ` ${className}` : ""}`} />;
}
