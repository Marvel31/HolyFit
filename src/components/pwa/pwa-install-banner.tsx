"use client";

import { useEffect, useState } from "react";
import { Download, Share, PlusSquare, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. 이미 PWA(독립 실행형)로 실행 중인지 확인
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) return;

    // 2. 사용자가 배너를 닫은 적이 있는지 확인 (24시간 동안 숨김)
    const dismissedAt = localStorage.getItem("holyfit_pwa_banner_dismissed");
    if (dismissedAt) {
      const hoursSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (hoursSince < 24) return;
    }

    // 3. iOS 디바이스 확인 (Safari)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // iOS의 경우 2초 후 배너 노출
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }

    // 4. Android/Chrome beforeinstallprompt 이벤트 리스닝
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsVisible(false);
      }
      setInstallPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("holyfit_pwa_banner_dismissed", Date.now().toString());
  };

  if (!isVisible || isStandalone) return null;

  return (
    <>
      {/* Floating Bottom / Top Banner */}
      <aside aria-label="앱 설치 안내" className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[400px] animate-fade-in-down">
        <div
          className="p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xl backdrop-blur-xl border"
          style={{
            background: "rgba(30, 39, 46, 0.95)",
            borderColor: "rgba(108, 92, 231, 0.4)",
            color: "#FFFFFF",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--hf-gradient-primary)" }}
            >
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1">
                HolyFit 앱으로 더 편하게!
              </p>
              <p className="text-[10px] text-gray-300">
                홈 화면에 추가하고 매일 빠르게 인증하세요
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-gray-100 transition-transform active:scale-95 shrink-0 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              설치
            </button>
            <button
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* iOS Safari 설치 안내 모달 */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-[400px] rounded-3xl p-6 space-y-4 animate-fade-in-up"
            style={{
              background: "var(--hf-bg-elevated)",
              border: "1px solid var(--hf-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--hf-text-primary)]">
                iPhone 홈 화면에 추가하기
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--hf-text-muted)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[var(--hf-text-secondary)]">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="w-6 h-6 rounded-full bg-[var(--hf-primary)] text-white font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <p>
                  Safari 브라우저 하단 중앙의 <strong>공유(Share) 버튼</strong> (
                  <Share className="w-3.5 h-3.5 inline mx-0.5" />
                  )을 탭하세요.
                </p>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="w-6 h-6 rounded-full bg-[var(--hf-primary)] text-white font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <p>
                  메뉴를 아래로 스크롤하여 <strong>'홈 화면에 추가'</strong> (
                  <PlusSquare className="w-3.5 h-3.5 inline mx-0.5" />
                  )를 선택하세요.
                </p>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="w-6 h-6 rounded-full bg-[var(--hf-primary)] text-white font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <p>
                  우측 상단의 <strong>'추가'</strong>를 누르면 홈 화면에 앱 아이콘이 생성됩니다!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 rounded-2xl text-xs font-bold text-white"
              style={{ background: "var(--hf-gradient-primary)" }}
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}
    </>
  );
}
