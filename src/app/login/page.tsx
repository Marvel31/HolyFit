"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      alert(`로그인 오류: ${decodeURIComponent(error)}`);
    }
  }, [searchParams]);

  return (
    <main className="flex flex-col flex-1 items-center justify-center px-6">
      {/* Hero */}
      <section
        className="absolute inset-0 z-0"
        style={{ background: "var(--hf-gradient-hero)" }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 animate-fade-in-up"
          style={{
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.3)",
            boxShadow: "var(--hf-shadow-glow)",
          }}
        >
          <span className="text-5xl">💪</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2 animate-fade-in-up">
          HolyFit
        </h1>
        <p className="text-white/70 text-sm mb-12 animate-fade-in-up">
          함께하는 운동 습관
        </p>

        {/* Login Buttons */}
        <div className="w-full space-y-3 animate-fade-in-up">
          {/* Kakao Login */}
          <a
            href="/auth/login?provider=kakao"
            className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            style={{
              background: "#FEE500",
              color: "#191919",
            }}
          >
            <KakaoIcon />
            카카오로 시작하기
          </a>

          {/* Google Login */}
          <a
            href="/auth/login?provider=google"
            className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            style={{
              background: "var(--hf-bg-card)",
              border: "1px solid var(--hf-border)",
              color: "var(--hf-text-primary)",
              boxShadow: "var(--hf-shadow-sm)",
            }}
          >
            <GoogleIcon />
            구글로 시작하기
          </a>
        </div>

        {/* Footer */}
        <p className="mt-10 text-xs text-white/40 text-center leading-relaxed">
          로그인 시{" "}
          <span className="underline underline-offset-2">이용약관</span> 및{" "}
          <span className="underline underline-offset-2">개인정보처리방침</span>
          에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </main>
  );
}

/* ===== Icons ===== */

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67-.15.55-.96 3.54-1 3.69 0 .05.02.1.06.13a.1.1 0 00.09.02c.13-.02 4.14-2.72 4.79-3.16.45.06.92.1 1.4.1 5.52 0 10-3.58 10-7.94S17.52 3 12 3z"
        fill="#191919"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoadingDots() {
  return (
    <span className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">로딩 중...</div>}>
      <LoginContent />
    </Suspense>
  );
}
