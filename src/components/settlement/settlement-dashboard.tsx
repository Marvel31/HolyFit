"use client";

import { useEffect, useState } from "react";
import {
  getWeeklyCurrentStatus,
  getWeeklySettlementReport,
  togglePenaltyPayment,
  getMyPointsSummary,
  WeeklyCurrentStatusResult,
  SettlementReportResult,
  PointHistoryItem,
} from "@/app/actions/settlement";
import { getPreviousWeekString } from "@/lib/date-utils";
import {
  BarChart3,
  Calendar,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Star,
  Users,
  Coins,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface SettlementDashboardProps {
  groupId: string;
  groupName: string;
}

type TabType = "current" | "past" | "points";

export default function SettlementDashboard({
  groupId,
  groupName,
}: SettlementDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("current");

  // 이번 주 실시간 현황
  const [currentStatus, setCurrentStatus] =
    useState<WeeklyCurrentStatusResult | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  // 지난 주 정산 리포트
  const [pastReport, setPastReport] = useState<SettlementReportResult | null>(
    null
  );
  const [loadingPast, setLoadingPast] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // 내 포인트 장부
  const [pointsSummary, setPointsSummary] = useState<{
    totalBonusPoints: number;
    histories: PointHistoryItem[];
  } | null>(null);
  const [loadingPoints, setLoadingPoints] = useState(false);

  // 1. 이번 주 현황 불러오기
  const loadCurrentStatus = async () => {
    setLoadingCurrent(true);
    const res = await getWeeklyCurrentStatus(groupId);
    if (res.data) {
      setCurrentStatus(res.data);
    }
    setLoadingCurrent(false);
  };

  // 2. 지난 주 정산 결과 불러오기
  const loadPastReport = async () => {
    setLoadingPast(true);
    const prevWeek = getPreviousWeekString();
    const res = await getWeeklySettlementReport(groupId, prevWeek);
    if (res.data) {
      setPastReport(res.data);
    }
    setLoadingPast(false);
  };

  // 3. 내 포인트 장부 불러오기
  const loadPointsSummary = async () => {
    setLoadingPoints(true);
    const res = await getMyPointsSummary();
    if (res.data) {
      setPointsSummary(res.data);
    }
    setLoadingPoints(false);
  };

  useEffect(() => {
    loadCurrentStatus();
    (window as any).reloadSettlementDashboard = () => {
      loadCurrentStatus();
      loadPastReport();
      loadPointsSummary();
    };
    return () => {
      delete (window as any).reloadSettlementDashboard;
    };
  }, [groupId]);

  useEffect(() => {
    if (activeTab === "current") {
      loadCurrentStatus();
    } else if (activeTab === "past") {
      loadPastReport();
    } else if (activeTab === "points") {
      loadPointsSummary();
    }
  }, [activeTab, groupId]);

  // 방장 벌금 수납 토글
  const handleTogglePayment = async (
    settlementId: string,
    currentPaid: boolean
  ) => {
    setTogglingId(settlementId);
    const res = await togglePenaltyPayment(settlementId, groupId, !currentPaid);
    if (res.success) {
      // 리포트 상태 즉시 반영
      setPastReport((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          settlements: prev.settlements.map((s) =>
            s.id === settlementId ? { ...s, isPenaltyPaid: !currentPaid } : s
          ),
        };
      });
    } else if (res.error) {
      alert(res.error);
    }
    setTogglingId(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ===== Sub Tabs ===== */}
      <div
        className="flex rounded-2xl p-1 gap-1"
        style={{ background: "var(--hf-bg-card)", border: "1px solid var(--hf-border)" }}
      >
        <button
          onClick={() => setActiveTab("current")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "current" ? "shadow-sm" : ""
          }`}
          style={{
            background:
              activeTab === "current"
                ? "var(--hf-gradient-primary)"
                : "transparent",
            color: activeTab === "current" ? "#FFFFFF" : "var(--hf-text-secondary)",
          }}
        >
          <BarChart3 className="w-3.5 h-3.5" /> 이번 주 현황
        </button>

        <button
          onClick={() => setActiveTab("past")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "past" ? "shadow-sm" : ""
          }`}
          style={{
            background:
              activeTab === "past"
                ? "var(--hf-gradient-primary)"
                : "transparent",
            color: activeTab === "past" ? "#FFFFFF" : "var(--hf-text-secondary)",
          }}
        >
          <Calendar className="w-3.5 h-3.5" /> 지난 주 정산
        </button>

        <button
          onClick={() => setActiveTab("points")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "points" ? "shadow-sm" : ""
          }`}
          style={{
            background:
              activeTab === "points"
                ? "var(--hf-gradient-primary)"
                : "transparent",
            color: activeTab === "points" ? "#FFFFFF" : "var(--hf-text-secondary)",
          }}
        >
          <Star className="w-3.5 h-3.5" /> 내 포인트
        </button>
      </div>

      {/* ===== Tab 1: 이번 주 현황 ===== */}
      {activeTab === "current" && (
        <div className="space-y-4">
          {loadingCurrent ? (
            <div className="card p-8 text-center text-xs text-[var(--hf-text-muted)] animate-pulse">
              이번 주 멤버 운동 현황을 집계 중입니다...
            </div>
          ) : currentStatus ? (
            <>
              {/* Cycle Info Bar */}
              <div
                className="card p-4 flex items-center justify-between"
                style={{ background: "var(--hf-bg-elevated)" }}
              >
                <div>
                  <span className="text-[11px] font-medium text-[var(--hf-text-muted)]">
                    정산 사이클 ({currentStatus.yearWeek})
                  </span>
                  <p className="text-xs font-bold text-[var(--hf-text-primary)] mt-0.5">
                    {currentStatus.startDate} ~ {currentStatus.endDate}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium text-[var(--hf-text-muted)]">
                    목표 / 벌금
                  </span>
                  <p className="text-xs font-bold text-[var(--hf-primary)] mt-0.5">
                    주 {currentStatus.targetCount}회 / {currentStatus.penaltyAmount}원
                  </p>
                </div>
              </div>

              {/* Members Status List */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--hf-border-light)]">
                  <h3 className="text-sm font-bold text-[var(--hf-text-primary)] flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[var(--hf-primary)]" /> 멤버별 달성 현황 ({currentStatus.members.length}명)
                  </h3>
                  <span className="text-[11px] text-[var(--hf-text-muted)]">
                    안전: {currentStatus.members.filter((m) => m.isSafe).length}명 / 위험: {currentStatus.members.filter((m) => !m.isSafe).length}명
                  </span>
                </div>

                <div className="space-y-3">
                  {currentStatus.members.map((member, index) => {
                    const progress = Math.min(
                      100,
                      Math.round(
                        (member.completedCount / currentStatus.targetCount) * 100
                      )
                    );

                    return (
                      <div
                        key={member.userId}
                        className="p-3 rounded-xl transition-all"
                        style={{
                          background: "var(--hf-bg)",
                          border: member.isSafe
                            ? "1px solid rgba(0, 184, 148, 0.2)"
                            : "1px solid var(--hf-border-light)",
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-extrabold w-4 text-[var(--hf-text-muted)]">
                              #{index + 1}
                            </span>
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                              {member.profileImage ? (
                                <img
                                  src={member.profileImage}
                                  alt={member.nickname}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-gray-500">
                                  {member.nickname.slice(0, 1)}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-[var(--hf-text-primary)]">
                                  {member.nickname}
                                </span>
                                {member.role === "ADMIN" && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 text-purple-700 font-bold">
                                    방장
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[var(--hf-text-muted)]">
                                {member.completedCount}회 완료 ({progress}%)
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          {member.isSafe ? (
                            <div className="flex flex-col items-end">
                              <span className="badge text-[10px] font-bold" style={{ background: "rgba(0, 184, 148, 0.12)", color: "var(--hf-success)" }}>
                                🛡️ 안전권
                              </span>
                              {member.expectedBonus > 0 && (
                                <span className="text-[9px] font-bold text-amber-500 mt-0.5">
                                  +{member.expectedBonus}P 보너스
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="badge text-[10px] font-bold" style={{ background: "rgba(255, 107, 107, 0.12)", color: "var(--hf-danger)" }}>
                                ⚠️ 미달 위험 ({currentStatus.penaltyAmount}원)
                              </span>
                              <span className="text-[9px] text-[var(--hf-text-muted)] mt-0.5">
                                {member.remainingCount}회 더 필요
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full overflow-hidden bg-black/5 dark:bg-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                              background: member.isSafe
                                ? "linear-gradient(90deg, #00b894, #00cec9)"
                                : "var(--hf-gradient-primary)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ===== Tab 2: 지난 주 정산 리포트 ===== */}
      {activeTab === "past" && (
        <div className="space-y-4">
          {loadingPast ? (
            <div className="card p-8 text-center text-xs text-[var(--hf-text-muted)] animate-pulse">
              지난 주 정산 리포트를 계산 및 불러오는 중입니다...
            </div>
          ) : pastReport ? (
            <>
              {/* Summary Overview Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="card p-3 text-center" style={{ background: "var(--hf-bg-elevated)" }}>
                  <span className="text-[10px] text-[var(--hf-text-muted)]">
                    총 부과 벌금
                  </span>
                  <p className="text-base font-extrabold text-[var(--hf-danger)] mt-0.5">
                    {pastReport.totalPenaltyAmount.toLocaleString()}원
                  </p>
                </div>
                <div className="card p-3 text-center" style={{ background: "var(--hf-bg-elevated)" }}>
                  <span className="text-[10px] text-[var(--hf-text-muted)]">
                    벌금 대상자
                  </span>
                  <p className="text-base font-extrabold text-[var(--hf-text-primary)] mt-0.5">
                    {pastReport.penaltyCount}명
                  </p>
                </div>
                <div className="card p-3 text-center" style={{ background: "var(--hf-bg-elevated)" }}>
                  <span className="text-[10px] text-[var(--hf-text-muted)]">
                    보너스 획득자
                  </span>
                  <p className="text-base font-extrabold text-[var(--hf-accent)] mt-0.5">
                    {pastReport.bonusCount}명
                  </p>
                </div>
              </div>

              {/* Settlement Member List */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--hf-border-light)]">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--hf-text-primary)]">
                      {pastReport.yearWeek} 정산 결과
                    </h3>
                    <p className="text-[10px] text-[var(--hf-text-muted)]">
                      {pastReport.startDate} ~ {pastReport.endDate}
                    </p>
                  </div>
                  {pastReport.isAdmin && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-[var(--hf-primary)] font-semibold border border-purple-200">
                      방장 모드 (수납 관리)
                    </span>
                  )}
                </div>

                <div className="space-y-2.5">
                  {pastReport.settlements.map((item) => {
                    const isPenaltyTarget = item.penaltyAmount > 0;
                    const hasBonus = item.bonusPointsEarned > 0;

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl flex items-center justify-between"
                        style={{
                          background: isPenaltyTarget && !item.isPenaltyPaid
                            ? "rgba(255, 107, 107, 0.05)"
                            : "var(--hf-bg)",
                          border: isPenaltyTarget && !item.isPenaltyPaid
                            ? "1px solid rgba(255, 107, 107, 0.2)"
                            : "1px solid var(--hf-border-light)",
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                            {item.profileImage ? (
                              <img
                                src={item.profileImage}
                                alt={item.nickname}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-xs text-gray-500">
                                {item.nickname.slice(0, 1)}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[var(--hf-text-primary)]">
                                {item.nickname}
                              </span>
                              <span className="text-[10px] text-[var(--hf-text-muted)]">
                                ({item.completedCount}/{item.targetCount}회)
                              </span>
                            </div>

                            {/* Result Text */}
                            {isPenaltyTarget ? (
                              <span className="text-[11px] font-bold text-[var(--hf-danger)]">
                                벌금 {item.penaltyAmount}원 부과
                              </span>
                            ) : hasBonus ? (
                              <span className="text-[11px] font-bold text-amber-500 flex items-center gap-0.5">
                                <Sparkles className="w-3 h-3" /> 보너스 +{item.bonusPointsEarned}P 적립
                              </span>
                            ) : (
                              <span className="text-[11px] text-[var(--hf-success)] font-medium">
                                목표 달성 완료 (0원)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Penalty Payment Status or Toggle */}
                        {isPenaltyTarget ? (
                          pastReport.isAdmin ? (
                            <button
                              disabled={togglingId === item.id}
                              onClick={() =>
                                handleTogglePayment(item.id, item.isPenaltyPaid)
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                item.isPenaltyPaid
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-red-500 text-white hover:bg-red-600 shadow-sm"
                              }`}
                            >
                              {item.isPenaltyPaid ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" /> 납부완료
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5" /> 미납 (체크)
                                </>
                              )}
                            </button>
                          ) : (
                            <span
                              className={`badge text-[10px] font-bold ${
                                item.isPenaltyPaid
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {item.isPenaltyPaid ? "납부완료" : "미납"}
                            </span>
                          )
                        ) : hasBonus ? (
                          <span className="badge text-[10px] font-bold bg-amber-100 text-amber-800">
                            +{item.bonusPointsEarned}P
                          </span>
                        ) : (
                          <span className="badge text-[10px] font-bold bg-green-50 text-green-700">
                            세이프
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ===== Tab 3: 내 포인트 장부 ===== */}
      {activeTab === "points" && (
        <div className="space-y-4">
          {loadingPoints ? (
            <div className="card p-8 text-center text-xs text-[var(--hf-text-muted)] animate-pulse">
              포인트 내역을 불러오는 중입니다...
            </div>
          ) : pointsSummary ? (
            <>
              {/* Total Points Balance Card */}
              <div
                className="card p-6 text-center relative overflow-hidden"
                style={{
                  background: "var(--hf-gradient-primary)",
                  color: "#FFFFFF",
                }}
              >
                <div className="relative z-10">
                  <span className="text-xs font-medium text-white/80 flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 fill-white text-white" /> 현재 보유 보너스 포인트
                  </span>
                  <div className="text-4xl font-extrabold tracking-tight mt-2 flex items-center justify-center gap-1">
                    {pointsSummary.totalBonusPoints}
                    <span className="text-xl font-bold">P</span>
                  </div>
                  <p className="text-[11px] text-white/80 mt-2">
                    주간 3회 초과 운동 시 1회당 +1P씩 자동으로 적립됩니다!
                  </p>
                </div>
              </div>

              {/* Point History List */}
              <div className="card p-4 space-y-3">
                <h3 className="text-sm font-bold text-[var(--hf-text-primary)] flex items-center gap-1.5 pb-2 border-b border-[var(--hf-border-light)]">
                  <Coins className="w-4 h-4 text-[var(--hf-primary)]" /> 포인트 적립/변동 내역
                </h3>

                {pointsSummary.histories.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--hf-text-muted)]">
                    아직 적립된 포인트 내역이 없습니다.
                    <br />
                    이번 주 주 3회를 초과해 달성하면 보너스가 지급돼요!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pointsSummary.histories.map((h) => (
                      <div
                        key={h.id}
                        className="p-3 rounded-xl flex items-center justify-between"
                        style={{
                          background: "var(--hf-bg)",
                          border: "1px solid var(--hf-border-light)",
                        }}
                      >
                        <div>
                          <p className="text-xs font-bold text-[var(--hf-text-primary)]">
                            {h.reason}
                          </p>
                          <span className="text-[10px] text-[var(--hf-text-muted)]">
                            {new Date(h.createdAt).toLocaleDateString("ko-KR", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-extrabold ${
                            h.pointsChange > 0
                              ? "text-[var(--hf-success)]"
                              : "text-[var(--hf-danger)]"
                          }`}
                        >
                          {h.pointsChange > 0 ? `+${h.pointsChange}` : h.pointsChange}P
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
