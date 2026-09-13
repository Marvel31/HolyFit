"use client";

import { useState } from "react";
import { createGroup } from "@/app/actions/group";
import {
  Users,
  Target,
  Coins,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function CreateGroupPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [penaltyAmount, setPenaltyAmount] = useState(200);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("weeklyTarget", weeklyTarget.toString());
    formData.set("penaltyAmount", penaltyAmount.toString());

    const result = await createGroup(formData);

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  const isValid = name.trim().length >= 1 && name.trim().length <= 20;

  return (
    <main className="flex flex-col flex-1 pb-8">
      {/* Header */}
      <header
        className="flex items-center gap-3 px-5 py-4 sticky top-0 z-30 glass"
      >
        <Link
          href="/dashboard"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "var(--hf-bg)" }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: "var(--hf-text-primary)" }} />
        </Link>
        <h1 className="text-lg font-bold" style={{ color: "var(--hf-text-primary)" }}>
          새 그룹 만들기
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="px-5 space-y-5 mt-2">
        {/* Group Name */}
        <div className="card p-5 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--hf-gradient-primary)" }}
            >
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm" style={{ color: "var(--hf-text-primary)" }}>
                그룹 정보
              </h2>
              <p className="text-xs" style={{ color: "var(--hf-text-muted)" }}>
                함께 운동할 그룹을 만들어보세요
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="그룹명 (최대 20자)"
              maxLength={20}
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "var(--hf-bg)",
                border: "1.5px solid var(--hf-border)",
                color: "var(--hf-text-primary)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--hf-primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--hf-border)")}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="그룹 소개 (선택)"
              maxLength={100}
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all"
              style={{
                background: "var(--hf-bg)",
                border: "1.5px solid var(--hf-border)",
                color: "var(--hf-text-primary)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--hf-primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--hf-border)")}
            />
          </div>
        </div>

        {/* Weekly Target */}
        <div className="card p-5 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--hf-gradient-accent)" }}
            >
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm" style={{ color: "var(--hf-text-primary)" }}>
                주간 목표
              </h2>
              <p className="text-xs" style={{ color: "var(--hf-text-muted)" }}>
                주 {weeklyTarget}회 이상 인증이 목표
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setWeeklyTarget(num)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background:
                    weeklyTarget === num
                      ? "var(--hf-gradient-primary)"
                      : "var(--hf-bg)",
                  color:
                    weeklyTarget === num
                      ? "#FFFFFF"
                      : "var(--hf-text-secondary)",
                  border:
                    weeklyTarget === num
                      ? "none"
                      : "1px solid var(--hf-border)",
                }}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Penalty Amount */}
        <div className="card p-5 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--hf-gradient-warm)" }}
            >
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm" style={{ color: "var(--hf-text-primary)" }}>
                미달 벌금
              </h2>
              <p className="text-xs" style={{ color: "var(--hf-text-muted)" }}>
                목표 미달 시 부과할 벌금
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[100, 200, 500, 1000].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setPenaltyAmount(amount)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background:
                    penaltyAmount === amount
                      ? "var(--hf-gradient-warm)"
                      : "var(--hf-bg)",
                  color:
                    penaltyAmount === amount
                      ? "#FFFFFF"
                      : "var(--hf-text-secondary)",
                  border:
                    penaltyAmount === amount
                      ? "none"
                      : "1px solid var(--hf-border)",
                }}
              >
                {amount}원
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p
            className="text-sm text-center py-2"
            style={{ color: "var(--hf-danger)" }}
          >
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="w-full py-4 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: isValid
              ? "var(--hf-gradient-primary)"
              : "var(--hf-text-muted)",
            boxShadow: isValid ? "var(--hf-shadow-lg)" : "none",
          }}
        >
          <Sparkles className="w-4 h-4" />
          {isSubmitting ? "생성 중..." : "그룹 생성하기"}
        </button>
      </form>
    </main>
  );
}
