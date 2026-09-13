"use client";

import { useEffect, useState } from "react";
import { getWeeklyCurrentStatus, WeeklyCurrentStatusResult } from "@/app/actions/settlement";
import { getCurrentWeekRange } from "@/lib/date-utils";
import { CheckCircle2, Circle, AlertCircle, Flame, ShieldCheck, Trophy } from "lucide-react";

interface WeeklyProgressCardProps {
  groupId: string;
}

export default function WeeklyProgressCard({ groupId }: WeeklyProgressCardProps) {
  const [data, setData] = useState<WeeklyCurrentStatusResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    const res = await getWeeklyCurrentStatus(groupId);
    if (res.data) {
      setData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, [groupId]);

  // 글로벌 리로드 바인딩
  useEffect(() => {
    (window as any).reloadWeeklyProgress = loadStatus;
    return () => {
      delete (window as any).reloadWeeklyProgress;
    };
  }, [groupId]);

  if (loading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full w-full mb-4" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      </div>
    );
  }

  if (!data || !data.myStatus) {
    return null;
  }

  const { myStatus, targetCount, penaltyAmount } = data;
  const { days } = getCurrentWeekRange();

  const progressPercent = Math.min(
    100,
    Math.round((myStatus.completedCount / targetCount) * 100)
  );

  return (
    <div className="card p-5 animate-fade-in-up relative overflow-hidden">
      {/* Background Glow */}
      <div
        className="absolute -right-10 -bottom-10 w-36 h-36 rounded-full opacity-10 blur-2xl pointer-events-none"
        style={{
          background: myStatus.isSafe
            ? "var(--hf-success)"
            : "var(--hf-primary)",
        }}
      />

      {/* Header Info */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold tracking-wider text-[var(--hf-text-muted)] flex items-center gap-1.5">
          이번 주 나의 운동 달성률
        </span>
        {myStatus.isSafe ? (
          <span className="badge flex items-center gap-1 text-xs font-bold" style={{ background: "rgba(0, 184, 148, 0.12)", color: "var(--hf-success)" }}>
            <ShieldCheck className="w-3.5 h-3.5" /> 벌금 세이프!
          </span>
        ) : (
          <span className="badge flex items-center gap-1 text-xs font-bold" style={{ background: "rgba(255, 107, 107, 0.12)", color: "var(--hf-danger)" }}>
            <AlertCircle className="w-3.5 h-3.5" /> 벌금 위험 ({penaltyAmount}원)
          </span>
        )}
      </div>

      {/* Progress Bar and Counts */}
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold text-[var(--hf-text-primary)]">
            {myStatus.completedCount}
          </span>
          <span className="text-sm font-medium text-[var(--hf-text-muted)]">
            / {targetCount}회 목표
          </span>
        </div>

        {myStatus.completedCount > targetCount && (
          <div className="flex items-center gap-1 text-xs font-bold text-[var(--hf-accent)]">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-bounce" />
            보너스 +{myStatus.completedCount - targetCount}P 획득 중!
          </div>
        )}
      </div>

      {/* Progress Line */}
      <div className="w-full h-3 rounded-full overflow-hidden mb-4" style={{ background: "var(--hf-bg)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progressPercent}%`,
            background: myStatus.isSafe
              ? "linear-gradient(90deg, #00b894, #00cec9)"
              : "var(--hf-gradient-primary)",
          }}
        />
      </div>

      {/* Motivational Status Message */}
      <div className="rounded-xl p-3 mb-4 text-xs font-medium flex items-center gap-2" style={{ background: "var(--hf-bg-elevated)", border: "1px solid var(--hf-border-light)" }}>
        {myStatus.completedCount === 0 ? (
          <>
            <span className="text-base">🏃</span>
            <span>이번 주 첫 운동을 시작해보세요! 목표까지 {targetCount}회 남았어요.</span>
          </>
        ) : myStatus.completedCount < targetCount ? (
          <>
            <span className="text-base">🔥</span>
            <span>
              벌금 세이프까지 <strong>{myStatus.remainingCount}회</strong> 더! 힘내세요.
            </span>
          </>
        ) : myStatus.completedCount === targetCount ? (
          <>
            <span className="text-base">🎉</span>
            <span>
              <strong>주 {targetCount}회 목표 완료!</strong> 지금부터는 운동 1회당 <strong>+1P</strong> 보너스 적립!
            </span>
          </>
        ) : (
          <>
            <span className="text-base">👑</span>
            <span>
              대단해요! 목표 초과 달성으로 총 <strong>+{myStatus.completedCount - targetCount}P</strong>의 보너스를 확보했어요!
            </span>
          </>
        )}
      </div>

      {/* Week Days Chips (월 ~ 일) */}
      <div className="grid grid-cols-7 gap-1.5 pt-1 border-t border-[var(--hf-border-light)]">
        {days.map((day) => {
          const isCertified = myStatus.workoutDates.includes(day.dateStr);
          return (
            <div
              key={day.dateStr}
              className={`flex flex-col items-center py-1.5 rounded-lg text-center transition-all ${
                day.isToday ? "ring-2 ring-[var(--hf-primary)] ring-offset-1" : ""
              }`}
              style={{
                background: isCertified
                  ? "rgba(0, 184, 148, 0.12)"
                  : day.isPastOrToday
                  ? "var(--hf-bg)"
                  : "transparent",
              }}
            >
              <span
                className="text-[10px] font-semibold mb-1"
                style={{
                  color: isCertified
                    ? "var(--hf-success)"
                    : day.isToday
                    ? "var(--hf-primary)"
                    : "var(--hf-text-muted)",
                }}
              >
                {day.dayName}
              </span>
              {isCertified ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--hf-success)] fill-[var(--hf-success)] text-white" />
              ) : (
                <Circle
                  className="w-3.5 h-3.5"
                  style={{
                    color: day.isPastOrToday ? "var(--hf-text-muted)" : "var(--hf-border)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
