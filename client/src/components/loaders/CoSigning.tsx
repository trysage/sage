import Image from "next/image";

interface Props {
  userLabel?: string;
  agentLabel?: string;
}

export function CoSigning({
  userLabel = "You",
  agentLabel = "Co-signing →",
}: Props) {
  return (
    <div className="l5">
      <div className="l5-row">
        <div className="l5-node l5-node-user">
          <div className="l5-user-glyph" />
        </div>
        <div className="l5-link" />
        <div className="l5-node">
          <Image src="/sage-mark-mint.png" alt="Sage" width={36} height={36} />
        </div>
      </div>
      <div className="l5-caption">
        <span className="l5-cap-user">{userLabel}</span>
        <span className="l5-cap-agent">{agentLabel}</span>
      </div>
    </div>
  );
}
