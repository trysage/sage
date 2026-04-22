import Image from "next/image";

interface AgentIdProps {
  label?: string;
}

export function AgentId({ label = "Sage · watching" }: AgentIdProps) {
  return (
    <span className="agent-id">
      <span className="av">
        <Image src="/sage-mark-mint.png" alt="Sage" width={18} height={18} />
      </span>
      <span>{label}</span>
      <span className="live" />
    </span>
  );
}
