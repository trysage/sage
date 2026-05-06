"use client";

import PrivyProvider from "./context/PrivyProvider";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ScreeningStatusProvider } from "./context/ScreeningStatusContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PrivyProvider>
        <AuthProvider>
          <ScreeningStatusProvider>{children}</ScreeningStatusProvider>
        </AuthProvider>
      </PrivyProvider>
    </ThemeProvider>
  );
}
