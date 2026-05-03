export function SuccessAnimation({ size = 120, loop = true }: { size?: number; loop?: boolean }) {
  return (
    <div className={`a-success${loop ? "" : " once"}`} style={{ width: size, height: size }} aria-label="Success">
      <svg viewBox="0 0 200 200" overflow="visible" role="img">
        <circle className="pulse" cx="100" cy="100" r="60" />
        <circle className="ring-bg" cx="100" cy="100" r="50" />
        <circle className="ring" cx="100" cy="100" r="50" />
        <circle className="disc" cx="100" cy="100" r="50" />
        <path className="check" d="M80 100 L95 115 L122 86" />
      </svg>
    </div>
  );
}
