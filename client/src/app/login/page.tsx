"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/app/context/AuthContext";
import { Splash } from "@/components/loaders";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.6-.2-2.3H12v4.4h6c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-2 3.3-4.9 3.3-8.3z"/>
    <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H1.9v2.9C3.8 20.5 7.6 23 12 23z"/>
    <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V6.9H1.9C1.3 8.4 1 9.9 1 11.5s.3 3.1.9 4.6l3.8-2.1z"/>
    <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.3 1.7l3.2-3.2C17.5 2 14.9 1 12 1 7.6 1 3.8 3.5 1.9 7l3.8 3c.9-2.7 3.4-4.6 6.3-4.6z"/>
  </svg>
);

export default function LoginPage() {
  const { user, wallet, loading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && wallet) {
      router.replace("/home");
    }
  }, [loading, user, wallet, router]);

  if (loading) {
    return <Splash message="Signing in to Sage" />;
  }

  return (
    <div className="scr-login">
      <div className="bg-glow" />

      <div className="login-stage">
        {/* ── Left: copy + CTA ── */}
        <div className="login-left">
          <span className="agent-id">
            <span className="av">
              <Image src="/sage-mark-mint.png" alt="Sage" width={18} height={18} />
            </span>
            <span>Agent · online</span>
            <span className="live" />
          </span>

          <h1>
            Welcome back.<br />
            <em>Sage</em> has been watching.
          </h1>

          <p className="sub">
            Your wallet is being watched. Sign in to see what Sage has been doing.
          </p>

          <button onClick={login} className="auth-btn primary">
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="login-foot">
            <a>What is Sage?</a>
            <a>·</a>
            <a>Privacy</a>
          </div>
        </div>

        {/* ── Right: live readout guardian card ── */}
        <div className="login-right">
          <aside className="guardian">
            <div className="head">
              <span className="title">
                <Image src="/sage-mark-mint.png" alt="" width={18} height={18} />
                Sage · live readout
              </span>
              <span className="pulse">
                <span className="dot" />
                WATCHING
              </span>
            </div>

            <div className="tx">
              <div>
                <div className="who">Jupiter Aggregator</div>
                <div className="addr">JUP4…vMSx</div>
                <p className="reason">Routine swap. Within your weekly band.</p>
              </div>
              <div>
                <span className="amount">
                  −0.84 SOL
                  <span className="sub">$148.20 · signed 14ms</span>
                </span>
                <div className="stat">
                  <span className="pill safe"><span className="dot" />PASS</span>
                </div>
              </div>
            </div>

            <div className="tx">
              <div>
                <div className="who">Unknown wallet</div>
                <div className="addr">7xKX…gQ4n</div>
                <p className="reason">First-time recipient. 4× your median outbound.</p>
              </div>
              <div>
                <span className="amount">
                  −4.20 SOL
                  <span className="sub">$740.00 · held 2m</span>
                </span>
                <div className="stat">
                  <span className="pill watch"><span className="dot" />REVIEW</span>
                </div>
              </div>
            </div>

            <div className="tx">
              <div>
                <div className="who">Suspect contract</div>
                <div className="addr">DRA1…nrZk</div>
                <p className="reason">Matches drainer fingerprint shared 6h ago.</p>
              </div>
              <div>
                <span className="amount">
                  −ALL SOL
                  <span className="sub">prevented</span>
                </span>
                <div className="stat">
                  <span className="pill danger"><span className="dot" />BLOCK</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
