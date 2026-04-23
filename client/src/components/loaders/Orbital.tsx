import Image from "next/image";

export function Orbital() {
  return (
    <div className="l2">
      <div className="l2-orb">
        <span className="l2-ring" />
        <span className="l2-ring l2-ring-spin" />
        <span className="l2-ring l2-ring-inner" />
        <Image src="/sage-mark-mint.png" alt="Sage" width={56} height={56} />
      </div>
    </div>
  );
}
