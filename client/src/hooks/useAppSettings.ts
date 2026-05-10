import { useState } from "react";

const CANCEL_KEY = "sage_enable_cancel";

export function useEnableCancel(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(CANCEL_KEY) === "true";
  });

  const set = (v: boolean) => {
    localStorage.setItem(CANCEL_KEY, String(v));
    setEnabled(v);
  };

  return [enabled, set];
}
