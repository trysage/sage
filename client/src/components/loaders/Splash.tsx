import Image from "next/image";

interface Props {
  message?: string;
}

export function Splash({ message = "Verifying signature" }: Props) {
  return (
    <div className="loader-splash">
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 30% 40%, rgba(91,209,142,.12), transparent 60%), radial-gradient(circle at 70% 80%, rgba(91,209,142,.08), transparent 60%)",
        }}
      />
      <div className="loader-splash-grid" />
      <div className="l8-center">
        <div className="l8-lockup">
          <Image
            src="/sage-mark-mint.png"
            alt="Sage"
            width={38}
            height={38}
            style={{ animation: "breath 2.4s ease-in-out infinite" }}
          />
          <span className="l8-word">
            Sage<span className="l8-term">.</span>
          </span>
        </div>
        <div className="l8-barwrap">
          <div className="l8-bar" />
        </div>
        <span className="l8-caption">{message}</span>
      </div>
    </div>
  );
}
