export function truncateAddress(address: string, start = 4, end = 4): string {
  if (!address) return "";
  if (address.length <= start + end + 1) return address;

  return `${address.slice(0, start)}…${address.slice(-end)}`;
}
