"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRangeFromYearWeek } from "@/lib/date-utils";

export interface MemberStatistic {
  userId: string;
  nickname: string;
  profileImage: string | null;
  workoutCounts: Record<string, number>;
  totalPenaltyPaid: number;
  totalBonusEarned: number;
  totalWorkouts: number;
}

export interface GroupStatisticsResult {
  members: MemberStatistic[];
  periodType: "all" | "monthly" | "weekly";
  filterValue: string;
}

/**
 * Returns month start and end dates (YYYY-MM-DD) for a given YYYY-MM
 */
function getMonthRange(yearMonth: string) {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const format = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return {
    startDateStr: format(startDate),
    endDateStr: format(endDate),
  };
}

export async function getGroupStatistics(
  groupId: string,
  periodType: "all" | "monthly" | "weekly",
  filterValue: string // e.g., "", "2026-10", "2026-W39"
): Promise<{ data?: GroupStatisticsResult; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 설정 오류" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const adminClient = createAdminClient();
  if (!adminClient) return { error: "서버 설정 오류" };

  // 1. 그룹 멤버 조회
  const { data: groupMembers, error: membersError } = await adminClient
    .from("group_members")
    .select(`
      user_id,
      users:user_id (
        id,
        nickname,
        profile_image
      )
    `)
    .eq("group_id", groupId);

  if (membersError || !groupMembers) return { error: "그룹 멤버 조회 실패" };

  // 날짜 범위 계산
  let startDateStr = "1970-01-01";
  let endDateStr = "2999-12-31";

  if (periodType === "monthly" && filterValue) {
    const range = getMonthRange(filterValue);
    startDateStr = range.startDateStr;
    endDateStr = range.endDateStr;
  } else if (periodType === "weekly" && filterValue) {
    const range = getRangeFromYearWeek(filterValue);
    startDateStr = range.startDateStr;
    endDateStr = range.endDateStr;
  }

  // 2. 운동 기록 조회
  let workoutsQuery = adminClient
    .from("workout_records")
    .select("user_id, workout_type, record_date")
    .eq("group_id", groupId);

  if (periodType !== "all") {
    workoutsQuery = workoutsQuery
      .gte("record_date", startDateStr)
      .lte("record_date", endDateStr);
  }

  const { data: workouts, error: workoutsError } = await workoutsQuery;
  if (workoutsError) return { error: "운동 기록 조회 실패" };

  // 3. 정산 기록 조회
  let settlementsQuery = adminClient
    .from("weekly_settlements")
    .select("user_id, penalty_amount, bonus_points_earned, is_penalty_paid, settled_at, year_week")
    .eq("group_id", groupId);

  if (periodType === "weekly" && filterValue) {
    settlementsQuery = settlementsQuery.eq("year_week", filterValue);
  } else if (periodType === "monthly" && filterValue) {
    // For monthly, settled_at shouldn't be used strictly if we want to align with weeks.
    // However, simplest way is to fetch all and filter by the week's end date falling within the month.
    // We will filter in memory to be accurate.
  }

  const { data: settlements, error: settlementsError } = await settlementsQuery;
  if (settlementsError) return { error: "정산 기록 조회 실패" };

  // 메모리 내에서 월간 필터링 (해당 주차의 끝나는 날이 해당 월에 포함되는지 기준)
  let filteredSettlements = settlements || [];
  if (periodType === "monthly" && filterValue) {
    filteredSettlements = filteredSettlements.filter((s) => {
      const { endDateStr: weekEnd } = getRangeFromYearWeek(s.year_week);
      return weekEnd >= startDateStr && weekEnd <= endDateStr;
    });
  }

  // 4. 통계 계산
  const statsMap = new Map<string, MemberStatistic>();

  for (const m of groupMembers) {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    statsMap.set(m.user_id, {
      userId: m.user_id,
      nickname: u?.nickname || "운동인",
      profileImage: u?.profile_image || null,
      workoutCounts: {},
      totalPenaltyPaid: 0,
      totalBonusEarned: 0,
      totalWorkouts: 0,
    });
  }

  for (const w of workouts || []) {
    const stat = statsMap.get(w.user_id);
    if (stat) {
      const type = w.workout_type || "기타";
      stat.workoutCounts[type] = (stat.workoutCounts[type] || 0) + 1;
      stat.totalWorkouts += 1;
    }
  }

  for (const s of filteredSettlements) {
    const stat = statsMap.get(s.user_id);
    if (stat) {
      if (s.is_penalty_paid) {
        stat.totalPenaltyPaid += s.penalty_amount;
      }
      stat.totalBonusEarned += s.bonus_points_earned;
    }
  }

  const members = Array.from(statsMap.values()).sort((a, b) => b.totalWorkouts - a.totalWorkouts);

  return {
    data: {
      members,
      periodType,
      filterValue,
    },
  };
}
