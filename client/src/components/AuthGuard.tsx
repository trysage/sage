"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Splash } from "@/components/loaders";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, wallet, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !wallet)) {
      router.replace("/login");
    }
  }, [loading, user, wallet, router]);

  if (loading) {
    return <Splash message="Loading Sage" />;
  }

  if (!user || !wallet) {
    return null;
  }

  return <>{children}</>;
}
