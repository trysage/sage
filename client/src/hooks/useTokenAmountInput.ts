"use client";

import { useReducer, useCallback } from "react";

export type AmountMode = "token" | "usd";

export interface TokenAmountInputState {
  mode: AmountMode;
  /** Current value shown in the input box — token qty or USD depending on mode */
  inputValue: string;
  /** Always the actual token quantity — use this for quotes and transactions */
  tokenAmount: string;
  /** Secondary line text (the other denomination). Null when no price or no input. */
  secondaryDisplay: string | null;
  setInputValue: (v: string) => void;
  /** Toggle between token and USD mode, converting the current value */
  toggleMode: () => void;
  /** Set input from a raw token amount string (e.g. MAX button). Converts to USD if in USD mode. */
  setTokenAmountDirect: (tokenAmt: string) => void;
  /** Reset back to token mode with an empty input */
  reset: () => void;
}

// ── Pure conversion helpers ───────────────────────────────────────────────────

function usdToToken(usd: string, price: number, decimals: number): string {
  if (!price || !usd) return "";
  const n = parseFloat(usd);
  if (!isFinite(n) || n <= 0) return "";
  // Floor (never round up) so back-converted amount never exceeds actual balance
  const d = Math.min(decimals, 9);
  const factor = 10 ** d;
  return (Math.floor((n / price) * factor) / factor).toString();
}

function tokenToUsd(token: string, price: number): string {
  if (!price || !token) return "";
  const n = parseFloat(token);
  if (!isFinite(n) || n <= 0) return "";
  // Floor cents so back-conversion never yields more tokens than the balance
  return (Math.floor(n * price * 100) / 100).toFixed(2);
}

function usdDisplay(tokenAmt: string, price: number): string | null {
  if (!price) return null;
  const n = parseFloat(tokenAmt);
  if (!isFinite(n) || n <= 0) return null;
  return `~$${(n * price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function tokenDisplay(usdAmt: string, price: number, symbol: string): string | null {
  if (!price) return null;
  const n = parseFloat(usdAmt);
  if (!isFinite(n) || n <= 0) return null;
  return `~${parseFloat((n / price).toPrecision(6)).toString()} ${symbol}`;
}

// ── Reducer ───────────────────────────────────────────────────────────────────

interface State {
  mode: AmountMode;
  inputValue: string;
  /**
   * When MAX is clicked we pin the exact token balance here so tokenAmount
   * never goes through a USD round-trip. Cleared as soon as the user edits
   * the input or toggles mode.
   */
  pinnedTokenAmount: string | null;
}

type Action =
  | { type: "set_input"; value: string }
  | { type: "toggle"; price: number; decimals: number }
  | { type: "set_token_direct"; tokenAmt: string; price: number }
  | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set_input":
      // Any manual edit clears the pin
      return { ...state, inputValue: action.value, pinnedTokenAmount: null };

    case "toggle": {
      const next: AmountMode = state.mode === "token" ? "usd" : "token";
      // Use pinned amount for the conversion source if available
      const source = state.pinnedTokenAmount ?? state.inputValue;
      let newInput = "";
      if (source && parseFloat(source) > 0) {
        newInput = next === "usd"
          ? tokenToUsd(source, action.price)
          : usdToToken(state.inputValue, action.price, action.decimals);
      }
      // Clear pin — user is actively switching, input is now authoritative
      return { mode: next, inputValue: newInput, pinnedTokenAmount: null };
    }

    case "set_token_direct":
      return {
        mode: state.mode,
        // In USD mode show the USD equivalent; in token mode show the token amount
        inputValue: state.mode === "token"
          ? action.tokenAmt
          : tokenToUsd(action.tokenAmt, action.price),
        // Pin the exact token amount regardless of mode
        pinnedTokenAmount: action.tokenAmt,
      };

    case "reset":
      return { mode: "token", inputValue: "", pinnedTokenAmount: null };
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTokenAmountInput(
  price: number,
  symbol: string,
  decimals: number,
): TokenAmountInputState {
  const [{ mode, inputValue, pinnedTokenAmount }, dispatch] = useReducer(reducer, {
    mode: "token",
    inputValue: "",
    pinnedTokenAmount: null,
  });

  // If MAX was clicked, use the pinned exact balance — no round-trip conversion
  const tokenAmount =
    pinnedTokenAmount ??
    (mode === "token" ? inputValue : usdToToken(inputValue, price, decimals));

  const secondaryDisplay =
    !inputValue || parseFloat(inputValue) <= 0
      ? null
      : mode === "token"
      ? usdDisplay(inputValue, price)
      : tokenDisplay(inputValue, price, symbol);

  const setInputValue = useCallback(
    (v: string) => dispatch({ type: "set_input", value: v }),
    [],
  );

  const toggleMode = useCallback(
    () => dispatch({ type: "toggle", price, decimals }),
    [price, decimals],
  );

  const setTokenAmountDirect = useCallback(
    (tokenAmt: string) => dispatch({ type: "set_token_direct", tokenAmt, price }),
    [price],
  );

  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return { mode, inputValue, tokenAmount, secondaryDisplay, setInputValue, toggleMode, setTokenAmountDirect, reset };
}
