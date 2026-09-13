"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * 6자리 랜덤 영숫자 초대 코드 생성
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 혼동 문자 제외 (0,O,1,I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createGroup(formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const weeklyTarget = parseInt(formData.get("weeklyTarget") as string) || 3;
  const penaltyAmount = parseInt(formData.get("penaltyAmount") as string) || 200;

  if (!name || name.trim().length < 1 || name.trim().length > 20) {
    return { error: "그룹명은 1~20자 사이로 입력해주세요." };
  }

  if (weeklyTarget < 1 || weeklyTarget > 7) {
    return { error: "주간 목표는 1~7회 사이로 설정해주세요." };
  }

  if (penaltyAmount < 0 || penaltyAmount > 10000) {
    return { error: "벌금은 0~10,000원 사이로 설정해주세요." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { error: "Supabase가 설정되지 않았습니다." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  // Generate unique invite code (retry if collision)
  let inviteCode = generateInviteCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from("groups")
      .select("id")
      .eq("invite_code", inviteCode)
      .single();

    if (!existing) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  // Create group
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      invite_code: inviteCode,
      weekly_target_count: weeklyTarget,
      penalty_amount: penaltyAmount,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (groupError || !group) {
    console.error("그룹 생성 실패:", groupError);
    return { error: "그룹 생성 중 오류가 발생했습니다." };
  }

  // Add creator as ADMIN member
  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
    role: "ADMIN",
  });

  if (memberError) {
    console.error("멤버 추가 실패:", memberError);
    return { error: "그룹 생성 중 오류가 발생했습니다." };
  }

  redirect("/dashboard");
}

export async function joinGroup(formData: FormData) {
  const inviteCode = (formData.get("inviteCode") as string)?.trim().toUpperCase();

  if (!inviteCode || inviteCode.length !== 6) {
    return { error: "6자리 초대 코드를 입력해주세요." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { error: "Supabase가 설정되지 않았습니다." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  // Find group by invite code (admin client으로 RLS 우회 — 아직 멤버가 아닌 사용자도 조회 가능)
  const adminClient = createAdminClient();
  if (!adminClient) {
    return { error: "서버 설정 오류가 발생했습니다." };
  }

  const { data: group } = await adminClient
    .from("groups")
    .select("id, name")
    .eq("invite_code", inviteCode)
    .single();

  if (!group) {
    return { error: "유효하지 않은 초대 코드입니다." };
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    return { error: "이미 참여 중인 그룹입니다." };
  }

  // Join group
  const { error: joinError } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
    role: "MEMBER",
  });

  if (joinError) {
    console.error("그룹 참여 실패:", joinError);
    return { error: "그룹 참여 중 오류가 발생했습니다." };
  }

  redirect("/dashboard");
}

export async function getUserGroups() {
  const supabase = await createClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships } = await supabase
    .from("group_members")
    .select(`
      role,
      groups:group_id (
        id,
        name,
        description,
        invite_code,
        weekly_target_count,
        penalty_amount,
        created_at
      )
    `)
    .eq("user_id", user.id);

  return memberships ?? [];
}

/**
 * 그룹 관리자(ADMIN) 권한 검증 헬퍼
 */
async function verifyGroupAdmin(groupId: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 설정 오류" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  // group_members에서 ADMIN 권한 확인
  const { data: member } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!member || member.role !== "ADMIN") {
    return { error: "그룹 관리자(방장)만 수행할 수 있습니다." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) return { error: "서버 관리자 설정 오류" };

  return { user, adminClient };
}

/**
 * 그룹 삭제 (방장 전용)
 * 그룹, 멤버십, 인증기록, 정산기록 및 Storage 사진들을 모두 영구 삭제합니다.
 */
export async function deleteGroup(groupId: string) {
  if (!groupId) return { error: "그룹 ID가 유효하지 않습니다." };

  const check = await verifyGroupAdmin(groupId);
  if (check.error || !check.adminClient) {
    return { error: check.error || "권한이 없습니다." };
  }

  const { adminClient } = check;

  // 1. Storage에 저장된 운동 사진 파일들 정리
  try {
    const { data: files } = await adminClient.storage
      .from("workout-photos")
      .list(groupId);

    if (files && files.length > 0) {
      const filePaths = files.map((f) => `${groupId}/${f.name}`);
      await adminClient.storage.from("workout-photos").remove(filePaths);
    }
  } catch (storageErr) {
    console.warn("Storage 파일 정리 중 오류 (무시하고 계속 진행):", storageErr);
  }

  // 2. 그룹 삭제 (ON DELETE CASCADE로 group_members, workout_records, weekly_settlements 자동 삭제됨)
  const { error: deleteError } = await adminClient
    .from("groups")
    .delete()
    .eq("id", groupId);

  if (deleteError) {
    console.error("그룹 삭제 실패:", deleteError);
    return { error: "그룹 삭제 중 오류가 발생했습니다." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * 그룹 초기화 (방장 전용)
 * 그룹 설정과 멤버 구성은 유지하고, 운동 인증 기록과 주간 정산 내역만 0건으로 리셋합니다.
 */
export async function resetGroup(groupId: string) {
  if (!groupId) return { error: "그룹 ID가 유효하지 않습니다." };

  const check = await verifyGroupAdmin(groupId);
  if (check.error || !check.adminClient) {
    return { error: check.error || "권한이 없습니다." };
  }

  const { adminClient } = check;

  // 1. Storage에 저장된 운동 사진 파일들 정리
  try {
    const { data: files } = await adminClient.storage
      .from("workout-photos")
      .list(groupId);

    if (files && files.length > 0) {
      const filePaths = files.map((f) => `${groupId}/${f.name}`);
      await adminClient.storage.from("workout-photos").remove(filePaths);
    }
  } catch (storageErr) {
    console.warn("Storage 파일 정리 중 오류 (무시하고 계속 진행):", storageErr);
  }

  // 2. workout_records 삭제
  const { error: workoutErr } = await adminClient
    .from("workout_records")
    .delete()
    .eq("group_id", groupId);

  if (workoutErr) {
    console.error("운동 기록 초기화 실패:", workoutErr);
    return { error: "운동 기록 초기화 중 오류가 발생했습니다." };
  }

  // 3. weekly_settlements 삭제
  const { error: settlementErr } = await adminClient
    .from("weekly_settlements")
    .delete()
    .eq("group_id", groupId);

  if (settlementErr) {
    console.error("정산 내역 초기화 실패:", settlementErr);
    return { error: "정산 내역 초기화 중 오류가 발생했습니다." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

