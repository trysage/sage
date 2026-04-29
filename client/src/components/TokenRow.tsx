interface TokenRowProps {
  name: string;
  symbol: string;
  amount: string;
  price: string;
  value: string;
  iconUrl?: string | null;
  change?: string;
  changeUp?: boolean;
  /** Legacy: specific token gradient class (ic-sol, ic-usdc, etc.) */
  bg?: "sage" | "sol" | "usdc" | "jup" | "bonk";
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
  bg,
}: TokenRowProps) {
  const icoClass = bg ? `ic-${bg}` : "ic-token";

  return (
    <div className="t-row">
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
      <div className="t-right">{value}</div>
    </div>
  );
}
