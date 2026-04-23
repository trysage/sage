interface Props {
  caption?: string;
}

export function TriadRhythm({ caption = "Thinking" }: Props) {
  return (
    <div className="l7">
      <div className="l7-dots">
        <span style={{ animationDelay: "0s" }} />
        <span style={{ animationDelay: "0.15s" }} />
        <span style={{ animationDelay: "0.30s" }} />
      </div>
      <span className="l7-caption">{caption}</span>
    </div>
  );
}
