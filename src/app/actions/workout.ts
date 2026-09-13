"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function submitWorkoutRecord(formData: FormData) {
  const groupId = formData.get("groupId") as string;
  const imageUrl = formData.get("imageUrl") as string;
  const storagePath = formData.get("storagePath") as string;
  const workoutType = formData.get("workoutType") as string;
  const memo = (formData.get("memo") as string) || null;

  if (!groupId || !imageUrl || !storagePath) {
    return { error: "필수 정보가 누락되었습니다." };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 설정 오류" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  // 1일 1회 인증 방어 로직 (UNIQUE 제약조건으로도 방어되지만, 여기서 한 번 더 체크)
  const today = new Date().toISOString().split("T")[0];

  const { data: existingRecord } = await supabase
    .from("workout_records")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .eq("record_date", today)
    .single();

  if (existingRecord) {
    return { error: "오늘은 이미 인증을 완료했습니다." };
  }

  const { error: insertError } = await supabase.from("workout_records").insert({
    group_id: groupId,
    user_id: user.id,
    record_date: today,
    image_url: imageUrl,
    storage_path: storagePath,
    workout_type: workoutType,
    memo: memo,
  });

  if (insertError) {
    console.error("인증 기록 저장 실패:", insertError);
    // 23505 = unique_violation
    if (insertError.code === "23505") {
      return { error: "오늘은 이미 인증을 완료했습니다." };
    }
    return { error: "인증 기록 저장 중 오류가 발생했습니다." };
  }

  return { success: true };
}

export async function getGroupFeed(groupId: string) {
  // 인증 확인
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 설정 오류" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  // Admin client로 피드 조회 (users RLS가 자기 자신만 허용하므로 admin 필요)
  const adminClient = createAdminClient();
  if (!adminClient) return { error: "서버 설정 오류" };

  const { data: records, error } = await adminClient
    .from("workout_records")
    .select(`
      id,
      record_date,
      image_url,
      workout_type,
      memo,
      created_at,
      photo_expires_at,
      is_photo_deleted,
      users:user_id (
        id,
        nickname,
        profile_image
      )
    `)
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("피드 조회 실패:", error);
    return { error: "피드를 불러오는 중 오류가 발생했습니다." };
  }

  return { data: records };
}

/**
 * 7일 경과된 사진을 정리하는 서버 액션
 */
export async function cleanupExpiredPhotosAction() {
  const supabase = createAdminClient();
  if (!supabase) return { error: "Supabase 설정 오류" };

  const now = new Date().toISOString();

  const { data: expiredRecords, error: fetchError } = await supabase
    .from("workout_records")
    .select("id, storage_path")
    .lt("photo_expires_at", now)
    .eq("is_photo_deleted", false)
    .limit(100);

  if (fetchError) {
    return { error: fetchError.message };
  }

  if (!expiredRecords || expiredRecords.length === 0) {
    return { success: true, count: 0 };
  }

  const paths = expiredRecords
    .map((r) => r.storage_path)
    .filter((p): p is string => Boolean(p));

  const ids = expiredRecords.map((r) => r.id);

  if (paths.length > 0) {
    await supabase.storage.from("workout-photos").remove(paths);
  }

  const { error: updateError } = await supabase
    .from("workout_records")
    .update({ is_photo_deleted: true, image_url: null })
    .in("id", ids);

  if (updateError) {
    return { error: updateError.message };
  }

  return { success: true, count: ids.length };
}
