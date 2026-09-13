"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function LandingClient() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <main className="flex flex-col flex-1">
      {/* Hero Section */}
      <section
        className="relative flex flex-col items-center justify-center px-6 pt-16 pb-12 text-center"
        style={{ background: "var(--hf-gradient-hero)" }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-8 left-4 w-20 h-20 rounded-full opacity-20 blur-2xl"
          style={{ background: "var(--hf-accent)" }}
        />
        <div
          className="absolute bottom-12 right-6 w-28 h-28 rounded-full opacity-15 blur-3xl"
          style={{ background: "var(--hf-primary-light)" }}
        />

        {/* Logo / Brand */}
        <div className="animate-fade-in-up relative z-10">
          <div
            className="w-20 h-20 rounded-[20px] flex items-center justify-center mb-6 mx-auto"
            style={{
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <span className="text-4xl">💪</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            HolyFit
          </h1>
          <p className="text-white/80 text-base max-w-[280px] mx-auto leading-relaxed">
            매일 운동 인증하고,
            <br />
            함께 성장하세요
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 -mt-6 relative z-10 space-y-3 animate-fade-in-up">
        <FeatureCard
          emoji="📸"
          title="일일 운동 인증"
          description="매일 사진 한 장으로 간편하게 인증"
          gradient="var(--hf-gradient-primary)"
        />
        <FeatureCard
          emoji="⚡"
          title="벌금 & 포인트"
          description="주 3회 미달 시 벌금 200원, 초과 달성 시 보너스 포인트"
          gradient="var(--hf-gradient-warm)"
        />
        <FeatureCard
          emoji="👥"
          title="그룹 챌린지"
          description="초대 코드로 친구와 함께 운동 습관 만들기"
          gradient="var(--hf-gradient-accent)"
        />
      </section>

      {/* CTA Buttons */}
      <section className="px-5 mt-8 mb-6 space-y-3 animate-fade-in-up flex flex-col items-center">
        <Link
          href="/login"
          className="w-full py-4 rounded-2xl text-white text-center font-semibold text-base transition-all active:scale-[0.98]"
          style={{
            background: "var(--hf-gradient-primary)",
            boxShadow: "var(--hf-shadow-lg)",
          }}
        >
          시작하기
        </Link>
      </section>

      {/* PWA Install Prompt */}
      {isInstallable && (
        <section className="px-5 mb-6 animate-scale-in">
          <button
            onClick={handleInstall}
            className="w-full py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
            style={{
              background: "rgba(108, 92, 231, 0.08)",
              border: "1px solid var(--hf-primary-light)",
              color: "var(--hf-primary)",
            }}
          >
            📲 홈 화면에 추가하기
          </button>
        </section>
      )}

      {/* Footer */}
      <footer
        className="mt-auto py-6 text-center text-xs"
        style={{ color: "var(--hf-text-muted)" }}
      >
        <p>HolyFit © 2026 | 함께하는 운동 습관</p>
      </footer>
    </main>
  );
}

/* ===== Sub Components ===== */

function FeatureCard({
  emoji,
  title,
  description,
  gradient,
}: {
  emoji: string;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{
          background: gradient,
          opacity: 0.9,
        }}
      >
        <span className="text-xl">{emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h3
          className="font-semibold text-sm mb-0.5"
          style={{ color: "var(--hf-text-primary)" }}
        >
          {title}
        </h3>
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--hf-text-secondary)" }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

/* ===== Type Augmentation for PWA Install ===== */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
