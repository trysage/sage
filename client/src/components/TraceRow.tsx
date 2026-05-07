interface TraceRowProps {
  ts: string;
  pill: "safe" | "watch" | "danger";
  label: string;
  title: string;
  meta: string;
  onClick?: () => void;
}

export function TraceRow({ ts, pill, label, title, meta, onClick }: TraceRowProps) {
  return (
    <div className="trace-row" onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <div className="ts">{ts}</div>
      <div className="body">
        <div className="head">
          <span className={`pill ${pill}`}>
            <span className="dot" />
            {label}
          </span>
          <span>{title}</span>
        </div>
        <div className="meta">{meta}</div>
      </div>
    </div>
  );
}
