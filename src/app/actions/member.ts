"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getGroupMembers(groupId: string) {
  // 1. 인증 확인
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 설정되지 않았습니다." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  // 2. Admin client로 멤버 조회 (users RLS가 자기 자신만 허용하므로 admin 필요)
  const adminClient = createAdminClient();
  if (!adminClient) return { error: "서버 설정 오류" };

  const { data: members, error } = await adminClient
    .from("group_members")
    .select(`
      id,
      role,
      joined_at,
      users:user_id (
        id,
        nickname,
        profile_image
      )
    `)
    .eq("group_id", groupId)
    .order("role", { ascending: true }) // ADMIN first
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("멤버 조회 실패:", error);
    return { error: "멤버 목록을 불러오는 중 오류가 발생했습니다." };
  }

  return { data: members };
}

export async function leaveGroup(groupId: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 설정되지 않았습니다." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const adminClient = createAdminClient();
  if (!adminClient) return { error: "서버 설정 오류" };

  // 1. 방장인지 확인 (방장은 나갈 수 없음)
  const { data: member } = await adminClient
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (member?.role === "ADMIN") {
    return { error: "방장은 그룹을 나갈 수 없습니다. 그룹을 삭제하거나 방장을 위임하세요." };
  }

  // 2. 멤버 탈퇴 (삭제)
  const { error } = await adminClient
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (error) {
    console.error("그룹 탈퇴 실패:", error);
    return { error: "그룹 탈퇴 중 오류가 발생했습니다." };
  }

  return { success: true };
}

export async function kickMember(groupId: string, targetUserId: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 설정되지 않았습니다." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const adminClient = createAdminClient();
  if (!adminClient) return { error: "서버 설정 오류" };

  // 1. 현재 사용자가 방장인지 확인
  const { data: currentMember } = await adminClient
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (currentMember?.role !== "ADMIN") {
    return { error: "방장만 그룹원을 강퇴할 수 있습니다." };
  }

  // 2. 강퇴할 대상이 방장인지 확인
  const { data: targetMember } = await adminClient
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", targetUserId)
    .single();

  if (targetMember?.role === "ADMIN") {
    return { error: "방장은 강퇴할 수 없습니다." };
  }

  // 3. 멤버 강퇴 (삭제)
  const { error } = await adminClient
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", targetUserId);

  if (error) {
    console.error("멤버 강퇴 실패:", error);
    return { error: "멤버 강퇴 중 오류가 발생했습니다." };
  }

  return { success: true };
}
