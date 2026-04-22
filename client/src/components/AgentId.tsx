interface AgentIdProps {
  label?: string;
}

export function AgentId({ label = "Watching" }: AgentIdProps) {
  return (
    <span className="agent-id">
      <span className="av">
        {/* plain img — avoids Next.js Image inline-size override on small icons */}
        <img src="/sage-mark-mint.png" alt="Sage" />
      </span>
      <span>{label}</span>
      <span className="live" />
    </span>
  );
}
