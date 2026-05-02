interface TokenRowProps {
  name: string;
  symbol: string;
  amount: string;
  price: string;
  value: string;
  iconUrl?: string | null;
  change?: string;
  changeUp?: boolean;
  /** 24h percent change from API (e.g. 3.21 or -1.5) */
  percentChange1d?: number | null;
  /** 24h absolute USD change (e.g. 0.42 or -1.20) */
  dollarChange1d?: number | null;
  /** Legacy: specific token gradient class (ic-sol, ic-usdc, etc.) */
  bg?: "sage" | "sol" | "usdc" | "jup" | "bonk";
  onClick?: () => void;
}

export function TokenRow({
  name,
  symbol,
  amount,
  price,
  value,
  iconUrl,
  change,
  changeUp,
  percentChange1d,
  dollarChange1d,
  bg,
  onClick,
}: TokenRowProps) {
  const icoClass = bg ? `ic-${bg}` : "ic-token";
  const pct = percentChange1d;
  const pctUp = pct != null ? pct >= 0 : (dollarChange1d != null ? dollarChange1d >= 0 : null);
  const usdStr = dollarChange1d != null
    ? `${dollarChange1d >= 0 ? "+" : "−"}$${Math.abs(dollarChange1d).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;

  return (
    <div className={`t-row${onClick ? " t-row-clickable" : ""}`} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}>
      <div className={`t-ico ${icoClass}`}>
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconUrl}
            alt={symbol}
            style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          name.charAt(0)
        )}
      </div>
      <div className="t-name">
        <span className="nm">{name}</span>
        <span className="sym">{symbol}</span>
      </div>
      <div className="t-amt">
        <span className="a">{amount}</span>
        <span className="price">
          <span>{price}</span>
          {change && (
            <span className={changeUp ? "up" : "dn"}>{change}</span>
          )}
        </span>
      </div>
      <div className="t-right">
        <span className="t-val">{value}</span>
        {usdStr && (
          <span className={`t-pct ${pctUp ? "up" : "dn"}`}>{usdStr}</span>
        )}
      </div>
    </div>
  );
}
