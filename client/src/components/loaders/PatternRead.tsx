import Image from "next/image";

interface Props {
  message?: string;
}

const WAVE_COUNT = 14;

export function PatternRead({ message = "Comparing against 6 months" }: Props) {
  return (
    <div className="l3">
      <div className="l3-head-row">
        <Image src="/sage-mark-mint.png" alt="Sage" width={28} height={28} />
        <span className="l3-label">Reading pattern</span>
      </div>
      <div className="l3-wave">
        {Array.from({ length: WAVE_COUNT }, (_, i) => (
          <span
            key={i}
            style={{ animationDelay: `${(i * 0.06).toFixed(2)}s` }}
          />
        ))}
      </div>
      <span className="l3-status">{message}</span>
    </div>
  );
}
