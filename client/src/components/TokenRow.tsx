interface TokenRowProps {
  bg: "sage" | "sol" | "usdc" | "jup" | "bonk";
  name: string;
  symbol: string;
  amount: string;
  price: string;
  change: string;
  changeUp?: boolean;
  value: string;
}

export function TokenRow({ bg, name, symbol, amount, price, change, changeUp, value }: TokenRowProps) {
  return (
    <div className="t-row">
      <div className={`t-ico ic-${bg}`}>{name.charAt(0)}</div>
      <div className="t-name">
        <span className="nm">{name}</span>
        <span className="sym">{symbol}</span>
      </div>
      <div className="t-amt">
        <span className="a">{amount}</span>
        <span className="price">
          <span>{price}</span>
          <span className={changeUp ? "up" : "dn"}>{change}</span>
        </span>
      </div>
      <div className="t-right">{value}</div>
    </div>
  );
}
