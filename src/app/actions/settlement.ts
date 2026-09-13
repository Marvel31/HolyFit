"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCurrentWeekRange,
  getPreviousWeekString,
  getRangeFromYearWeek,
  getISOWeekString,
} from "@/lib/date-utils";

export interface MemberWeeklyStatus {
  userId: string;
  nickname: string;
  profileImage: string | null;
  role: string;
  completedCount: number;
  targetCount: number;
  remainingCount: number;
  isSafe: boolean; // 목표 달성 여부
  expectedBonus: number; // 현재 기준 예상 보너스 포인트
  expectedPenalty: number; // 현재 미달 시 예상 벌금
  workoutDates: string[]; // 이번 주 인증한 날짜들 (YYYY-MM-DD)
}

export interface WeeklyCurrentStatusResult {
  yearWeek: string;
  startDate: string;
  endDate: string;
  targetCount: number;
  penaltyAmount: number;
  members: MemberWeeklyStatus[];
  myStatus: MemberWeeklyStatus | null;
}

/**
 * 이번 주(월~일) 실시간 그룹 멤버별 운동 인증 달성 현황 조회
 */
export async function getWeeklyCurrentStatus(
  groupId: string
): Promise<{ data?: WeeklyCurrentStatusResult; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 설정 오류" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  // 1. 그룹 정보 조회
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name, weekly_target_count, penalty_amount")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    return { error: "그룹 정보를 찾을 수 없습니다." };
  }

  // 2. 그룹 멤버 목록 조회 (admin client로 users RLS 우회)
  const adminClient = createAdminClient();
  if (!adminClient) return { error: "서버 설정 오류" };

  const { data: members, error: membersError } = await adminClient
    .from("group_members")
    .select(`
      id,
      role,
      user_id,
      users:user_id (
        id,
        nickname,
        profile_image
      )
    `)
    .eq("group_id", groupId);

  if (membersError || !members) {
    return { error: "그룹 멤버를 불러오지 못했습니다." };
  }

  // 3. 이번 주 날짜 범위 계산
  const { startDateStr, endDateStr, yearWeek } = getCurrentWeekRange();

  // 4. 이번 주 그룹의 모든 운동 인증 기록 조회
  const { data: records, error: recordsError } = await supabase
    .from("workout_records")
    .select("user_id, record_date")
    .eq("group_id", groupId)
    .gte("record_date", startDateStr)
    .lte("record_date", endDateStr);

  if (recordsError) {
    return { error: "운동 기록을 불러오지 못했습니다." };
  }

  // 유저별 인증 날짜 매핑
  const userRecordsMap = new Map<string, string[]>();
  for (const record of records || []) {
    const arr = userRecordsMap.get(record.user_id) || [];
    arr.push(record.record_date);
    userRecordsMap.set(record.user_id, arr);
  }

  const targetCount = group.weekly_target_count || 3;
  const penaltyAmount = group.penalty_amount || 200;

  let myStatus: MemberWeeklyStatus | null = null;

  const memberStatuses: MemberWeeklyStatus[] = members.map((m) => {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    const userId = m.user_id;
    const nickname = u?.nickname || "운동인";
    const profileImage = u?.profile_image || null;
    const workoutDates = userRecordsMap.get(userId) || [];
    const completedCount = workoutDates.length;
    const isSafe = completedCount >= targetCount;
    const remainingCount = Math.max(0, targetCount - completedCount);
    const expectedBonus = Math.max(0, completedCount - targetCount);
    const expectedPenalty = isSafe ? 0 : penaltyAmount;

    const status: MemberWeeklyStatus = {
      userId,
      nickname,
      profileImage,
      role: m.role,
      completedCount,
      targetCount,
      remainingCount,
      isSafe,
      expectedBonus,
      expectedPenalty,
      workoutDates,
    };

    if (userId === user.id) {
      myStatus = status;
    }

    return status;
  });

  // 인증 횟수 내림차순 정렬
  memberStatuses.sort((a, b) => b.completedCount - a.completedCount);

  return {
    data: {
      yearWeek,
      startDate: startDateStr,
      endDate: endDateStr,
      targetCount,
      penaltyAmount,
      members: memberStatuses,
      myStatus,
    },
  };
}

export interface SettlementRecordItem {
  id: string;
  userId: string;
  nickname: string;
  profileImage: string | null;
  role: string;
  completedCount: number;
  targetCount: number;
  penaltyAmount: number;
  bonusPointsEarned: number;
  isPenaltyPaid: boolean;
  settledAt: string;
}

export interface SettlementReportResult {
  yearWeek: string;
  startDate: string;
  endDate: string;
  targetCount: number;
  penaltyUnit: number;
  totalPenaltyAmount: number;
  penaltyCount: number;
  bonusCount: number;
  isAdmin: boolean;
  settlements: SettlementRecordItem[];
}

/**
 * 특정 주차(기본값: 지난주)의 주간 정산 리포트 조회
 * 정산 레코드가 생성되어 있지 않다면 룰 엔진을 실행하여 생성(Idempotent)
 */
export async function getWeeklySettlementReport(
  groupId: string,
  targetYearWeek?: string
): Promise<{ data?: SettlementReportResult; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 설정 오류" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const yearWeek = targetYearWeek || getPreviousWeekString();
  const { startDateStr, endDateStr } = getRangeFromYearWeek(yearWeek);

  // 1. 그룹 정보 및 본인 역할 조회
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name, weekly_target_count, penalty_amount")
    .eq("id", groupId)
    .single();

  if (groupError || !group) return { error: "그룹 정보를 찾을 수 없습니다." };

  const { data: myMember } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  const isAdmin = myMember?.role === "ADMIN";

  // 2. 해당 그룹의 모든 멤버 조회 (admin client로 users RLS 우회)
  const adminClient = createAdminClient();
  if (!adminClient) return { error: "서버 설정 오류" };

  const { data: groupMembers, error: membersError } = await adminClient
    .from("group_members")
    .select(`
      id,
      role,
      user_id,
      users:user_id (
        id,
        nickname,
        profile_image,
        total_bonus_points
      )
    `)
    .eq("group_id", groupId);

  if (membersError || !groupMembers) return { error: "그룹 멤버 조회 실패" };

  // 3. 기존 주간 정산 결과 조회
  const { data: existingSettlements, error: settlementError } = await supabase
    .from("weekly_settlements")
    .select("*")
    .eq("group_id", groupId)
    .eq("year_week", yearWeek);

  if (settlementError) return { error: "정산 내역 조회 실패" };

  const settledUserIds = new Set((existingSettlements || []).map((s) => s.user_id));

  // 정산되지 않은 멤버가 있다면 자동 정산 생성 (룰 엔진 실행)
  const unSettledMembers = groupMembers.filter((m) => !settledUserIds.has(m.user_id));

  if (unSettledMembers.length > 0) {
    // 해당 주차 운동 기록 조회
    const { data: weekRecords } = await supabase
      .from("workout_records")
      .select("user_id, record_date")
      .eq("group_id", groupId)
      .gte("record_date", startDateStr)
      .lte("record_date", endDateStr);

    const userCountMap = new Map<string, number>();
    for (const r of weekRecords || []) {
      userCountMap.set(r.user_id, (userCountMap.get(r.user_id) || 0) + 1);
    }

    const targetCount = group.weekly_target_count || 3;
    const penaltyAmount = group.penalty_amount || 200;

    for (const member of unSettledMembers) {
      const u = Array.isArray(member.users) ? member.users[0] : member.users;
      const completedCount = userCountMap.get(member.user_id) || 0;
      let penalty = 0;
      let bonus = 0;

      if (completedCount < targetCount) {
        penalty = penaltyAmount;
      } else if (completedCount > targetCount) {
        bonus = completedCount - targetCount;
      }

      // weekly_settlements 삽입
      const { data: newSettlement, error: insertError } = await supabase
        .from("weekly_settlements")
        .insert({
          group_id: groupId,
          user_id: member.user_id,
          year_week: yearWeek,
          completed_count: completedCount,
          target_count: targetCount,
          penalty_amount: penalty,
          bonus_points_earned: bonus,
          is_penalty_paid: penalty === 0, // 벌금이 0원이면 자동 납부 처리
        })
        .select()
        .single();

      if (!insertError && newSettlement) {
        // 보너스 포인트가 있다면 point_histories 기록 및 users.total_bonus_points 갱신
        if (bonus > 0) {
          await supabase.from("point_histories").insert({
            user_id: member.user_id,
            group_id: groupId,
            points_change: bonus,
            reason: `${yearWeek} 주간 초과 달성 (${completedCount}회 인증)`,
            year_week: yearWeek,
          });

          const currentTotal = u?.total_bonus_points || 0;
          await supabase
            .from("users")
            .update({ total_bonus_points: currentTotal + bonus })
            .eq("id", member.user_id);
        }
      }
    }
  }

  // 4. 최종 정산 목록 다시 조회
  const { data: settlements, error: settlementsError } = await adminClient
    .from("weekly_settlements")
    .select(`
      id,
      user_id,
      year_week,
      completed_count,
      target_count,
      penalty_amount,
      bonus_points_earned,
      is_penalty_paid,
      settled_at,
      users:user_id (
        id,
        nickname,
        profile_image
      )
    `)
    .eq("group_id", groupId)
    .eq("year_week", yearWeek);

  const memberRoleMap = new Map(groupMembers.map((m) => [m.user_id, m.role]));

  let totalPenaltyAmount = 0;
  let penaltyCount = 0;
  let bonusCount = 0;

  const settlementItems: SettlementRecordItem[] = (settlements || []).map((s) => {
    const u = Array.isArray(s.users) ? s.users[0] : s.users;
    if (s.penalty_amount > 0) {
      totalPenaltyAmount += s.penalty_amount;
      penaltyCount++;
    }
    if (s.bonus_points_earned > 0) {
      bonusCount++;
    }

    return {
      id: s.id,
      userId: s.user_id,
      nickname: u?.nickname || "운동인",
      profileImage: u?.profile_image || null,
      role: memberRoleMap.get(s.user_id) || "MEMBER",
      completedCount: s.completed_count,
      targetCount: s.target_count,
      penaltyAmount: s.penalty_amount,
      bonusPointsEarned: s.bonus_points_earned,
      isPenaltyPaid: s.is_penalty_paid,
      settledAt: s.settled_at,
    };
  });

  // 정렬: 벌금 대상자 우선, 그다음 완료 횟수 내림차순
  settlementItems.sort((a, b) => {
    if (a.penaltyAmount > 0 && b.penaltyAmount === 0) return -1;
    if (a.penaltyAmount === 0 && b.penaltyAmount > 0) return 1;
    return b.completedCount - a.completedCount;
  });

  return {
    data: {
      yearWeek,
      startDate: startDateStr,
      endDate: endDateStr,
      targetCount: group.weekly_target_count,
      penaltyUnit: group.penalty_amount,
      totalPenaltyAmount,
      penaltyCount,
      bonusCount,
      isAdmin,
      settlements: settlementItems,
    },
  };
}

/**
 * 방장 전용: 벌금 수납 여부 토글 (납부 완료 / 미납)
 */
export async function togglePenaltyPayment(
  settlementId: string,
  groupId: string,
  isPaid: boolean
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 설정 오류" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  // 방장 권한 체크
  const { data: member } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (member?.role !== "ADMIN") {
    return { error: "방장만 벌금 수납 상태를 변경할 수 있습니다." };
  }

  const { error } = await supabase
    .from("weekly_settlements")
    .update({ is_penalty_paid: isPaid })
    .eq("id", settlementId)
    .eq("group_id", groupId);

  if (error) {
    return { error: "수납 상태 변경 중 오류가 발생했습니다." };
  }

  return { success: true };
}

export interface PointHistoryItem {
  id: string;
  pointsChange: number;
  reason: string;
  yearWeek: string | null;
  createdAt: string;
}

/**
 * 로그인한 사용자의 총 보유 포인트 및 변동 내역 조회
 */
export async function getMyPointsSummary(): Promise<{
  data?: {
    totalBonusPoints: number;
    histories: PointHistoryItem[];
  };
  error?: string;
}> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 설정 오류" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("users")
    .select("total_bonus_points")
    .eq("id", user.id)
    .single();

  const { data: histories, error } = await supabase
    .from("point_histories")
    .select("id, points_change, reason, year_week, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: "포인트 이력 조회 실패" };

  return {
    data: {
      totalBonusPoints: profile?.total_bonus_points || 0,
      histories: (histories || []).map((h) => ({
        id: h.id,
        pointsChange: h.points_change,
        reason: h.reason,
        yearWeek: h.year_week,
        createdAt: h.created_at,
      })),
    },
  };
}
