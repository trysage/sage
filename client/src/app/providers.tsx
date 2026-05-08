"use client";

import PrivyProvider from "./context/PrivyProvider";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ExplorerProvider } from "./context/ExplorerContext";
import { ScreeningStatusProvider } from "./context/ScreeningStatusContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ExplorerProvider>
        <PrivyProvider>
          <AuthProvider>
            <ScreeningStatusProvider>{children}</ScreeningStatusProvider>
          </AuthProvider>
        </PrivyProvider>
      </ExplorerProvider>
    </ThemeProvider>
  );
}
