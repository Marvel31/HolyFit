"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createUserProfile } from "@/app/actions/auth";
import { User, Sparkles } from "lucide-react";

function OnboardingContent() {
  const searchParams = useSearchParams();
  const [nickname, setNickname] = useState(searchParams.get("nickname") || "");
  const [error, setError] = useState<string | null>(searchParams.get("error") || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      setError(decodeURIComponent(err));
      setIsSubmitting(false);
    }
  }, [searchParams]);

  const trimmedLength = nickname.trim().length;

  return (
    <main className="flex flex-col flex-1 items-center justify-center px-6 min-h-dvh">
      {/* Background */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: "var(--hf-gradient-hero)" }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg"
            style={{
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(12px)",
              border: "1.5px solid rgba(255,255,255,0.3)",
            }}
          >
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1.5 flex items-center justify-center gap-1.5">
            프로필 설정 <Sparkles className="w-5 h-5 text-amber-300" />
          </h1>
          <p className="text-white/70 text-sm">
            그룹원들에게 보여질 닉네임을 입력해주세요
          </p>
        </div>

        {/* Form Card (Native Form Action + Client Progressive Enhancement) */}
        <form
          action={createUserProfile}
          method="POST"
          onSubmit={() => setIsSubmitting(true)}
          className="card p-6 space-y-5 animate-fade-in-up shadow-2xl"
          style={{ background: "var(--hf-bg-card)", border: "1px solid var(--hf-border)" }}
        >
          {/* Nickname Input */}
          <div>
            <label
              htmlFor="nickname"
              className="block text-sm font-semibold mb-2"
              style={{ color: "var(--hf-text-secondary)" }}
            >
              닉네임
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              required
              minLength={2}
              maxLength={12}
              value={nickname}
              onInput={(e) => {
                setNickname((e.target as HTMLInputElement).value);
                setError(null);
              }}
              onChange={(e) => {
                setNickname(e.target.value);
                setError(null);
              }}
              placeholder="예: Marvel21, 헬스러버"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all"
              style={{
                background: "var(--hf-bg)",
                border: error
                  ? "2px solid var(--hf-danger)"
                  : "1.5px solid var(--hf-border)",
                color: "var(--hf-text-primary)",
              }}
            />

            <div className="flex items-center justify-between mt-2">
              {error ? (
                <p className="text-xs font-semibold" style={{ color: "var(--hf-danger)" }}>
                  {error}
                </p>
              ) : (
                <p className="text-xs" style={{ color: "var(--hf-text-muted)" }}>
                  한글, 영문, 숫자 가능 (2~12자)
                </p>
              )}
              <span
                className="text-xs font-bold"
                style={{
                  color:
                    trimmedLength >= 2 && trimmedLength <= 12
                      ? "var(--hf-success)"
                      : "var(--hf-text-muted)",
                }}
              >
                {trimmedLength}/12
              </span>
            </div>
          </div>

          {/* Submit Button (네이티브 Form Submit 보장) */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.98] cursor-pointer shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
            style={{
              background: "var(--hf-gradient-primary)",
              boxShadow: "0 4px 15px rgba(108, 92, 231, 0.35)",
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                프로필 생성 중...
              </span>
            ) : (
              "HolyFit 시작하기 🚀"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">로딩 중...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}
