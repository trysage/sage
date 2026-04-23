"use client";

import PrivyProvider from "./context/PrivyProvider";
import { AuthProvider } from "./context/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider>
      <AuthProvider>{children}</AuthProvider>
    </PrivyProvider>
  );
}
