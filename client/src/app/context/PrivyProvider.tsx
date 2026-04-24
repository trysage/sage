"use client";

import { PrivyProvider as PrivyReactProvider } from "@privy-io/react-auth";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

export default function PrivyProvider({ children }: { children: React.ReactNode }) {
  if (!PRIVY_APP_ID) {
    return <>{children}</>;
  }

  return (
    <PrivyReactProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["google"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
          solana: {
            createOnLogin: "off",
          },
        },
        appearance: {
          theme: "dark",
          accentColor: "#5BD18E",
          logo: "/sage-mark-mint.png",
        },
      }}
    >
      {children}
    </PrivyReactProvider>
  );
}
