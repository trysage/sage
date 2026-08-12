import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { WCSessionProposal } from "@/components/WCSessionProposal";
import { WCTransactionRequest } from "@/components/WCTransactionRequest";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {children}
      <BottomNav />
      <WCSessionProposal />
      <WCTransactionRequest />
    </AuthGuard>
  );
}
