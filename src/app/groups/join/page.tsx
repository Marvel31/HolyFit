"use client";

import { useState, useRef, useCallback } from "react";
import { joinGroup } from "@/app/actions/group";
import { Ticket, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function JoinGroupPage() {
  const [rawValue, setRawValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  // Derive the 6-char display array from the single raw string
  const chars = rawValue.split("").concat(Array(6).fill("")).slice(0, 6);
  const isComplete = rawValue.length >= 6;
  const activeIndex = Math.min(rawValue.length, 5);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
      setRawValue(val);
      setError(null);
    },
    []
  );

  const focusHiddenInput = useCallback(() => {
    hiddenInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rawValue.length !== 6) {
      setError("6자리 코드를 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("inviteCode", rawValue);

    const result = await joinGroup(formData);

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex flex-col flex-1 pb-8">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 sticky top-0 z-30 glass">
        <Link
          href="/dashboard"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "var(--hf-bg)" }}
        >
          <ArrowLeft
            className="w-5 h-5"
            style={{ color: "var(--hf-text-primary)" }}
          />
        </Link>
        <h1
          className="text-lg font-bold"
          style={{ color: "var(--hf-text-primary)" }}
        >
          그룹 참여하기
        </h1>
      </header>

      <div className="px-5 mt-8 flex flex-col items-center">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 animate-fade-in-up"
          style={{ background: "var(--hf-gradient-accent)" }}
        >
          <Ticket className="w-10 h-10 text-white" />
        </div>

        <h2
          className="text-xl font-bold mb-2 animate-fade-in-up"
          style={{ color: "var(--hf-text-primary)" }}
        >
          초대 코드 입력
        </h2>
        <p
          className="text-sm mb-8 animate-fade-in-up"
          style={{ color: "var(--hf-text-secondary)" }}
        >
          방장에게 받은 6자리 코드를 입력하세요
        </p>

        {/* Code Input */}
        <form onSubmit={handleSubmit} className="w-full max-w-xs">
          {/* Hidden real input — captures all keyboard input on mobile */}
          <input
            ref={hiddenInputRef}
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            value={rawValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            maxLength={6}
            aria-label="초대 코드"
            style={{
              position: "absolute",
              opacity: 0,
              width: 1,
              height: 1,
              pointerEvents: "none",
            }}
          />

          {/* Visual code boxes — tapping any box focuses the hidden input */}
          <div
            className="flex gap-2 mb-6 animate-fade-in-up"
            onClick={focusHiddenInput}
            style={{ cursor: "text" }}
          >
            {chars.map((char, index) => {
              const isCurrent = isFocused && index === activeIndex;
              const isFilled = char !== "";
              return (
                <div
                  key={index}
                  className="w-full aspect-square rounded-xl flex items-center justify-center text-xl font-bold transition-all"
                  style={{
                    background: "var(--hf-bg-card)",
                    border: isFilled
                      ? "2px solid var(--hf-primary)"
                      : error
                        ? "2px solid var(--hf-danger)"
                        : isCurrent
                          ? "2px solid var(--hf-primary-light)"
                          : "2px solid var(--hf-border)",
                    color: "var(--hf-text-primary)",
                    boxShadow: isFilled ? "var(--hf-shadow-sm)" : "none",
                  }}
                >
                  {isFilled ? (
                    char
                  ) : isCurrent ? (
                    <span
                      style={{
                        display: "inline-block",
                        width: 2,
                        height: 24,
                        background: "var(--hf-primary)",
                        borderRadius: 1,
                        animation: "blink 1s step-end infinite",
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Blink animation */}
          <style>{`
            @keyframes blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0; }
            }
          `}</style>

          {/* Error */}
          {error && (
            <p
              className="text-sm text-center mb-4"
              style={{ color: "var(--hf-danger)" }}
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!isComplete || isSubmitting}
            className="w-full py-4 rounded-2xl text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed animate-fade-in-up"
            style={{
              background: isComplete
                ? "var(--hf-gradient-primary)"
                : "var(--hf-text-muted)",
              boxShadow: isComplete ? "var(--hf-shadow-lg)" : "none",
            }}
          >
            {isSubmitting ? "참여 중..." : "그룹 참여하기"}
          </button>
        </form>
      </div>
    </main>
  );
}

