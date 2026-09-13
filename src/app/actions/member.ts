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

