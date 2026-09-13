"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function submitWorkoutRecord(formData: FormData) {
  const groupId = formData.get("groupId") as string;
  let imageUrl = (formData.get("imageUrl") as string) || "";
  let storagePath = (formData.get("storagePath") as string) || "";
  const workoutType = (formData.get("workoutType") as string) || "기타";
  const memo = (formData.get("memo") as string) || null;
  const photo = formData.get("photo") as File | null;

  if (!groupId) {
    return { error: "그룹 정보가 누락되었습니다." };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 설정 오류" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const adminClient = createAdminClient();
  if (!adminClient) return { error: "서버 설정 오류" };

  // 그룹 멤버십 확인 (ADMIN 또는 MEMBER 모두 허용)
  const { data: member, error: memberError } = await adminClient
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !member) {
    return { error: "해당 그룹의 멤버만 인증할 수 있습니다." };
  }

  // 1일 1회 인증 방어 로직 (UNIQUE 제약조건 확인)
  const today = new Date().toISOString().split("T")[0];

  const { data: existingRecord } = await adminClient
    .from("workout_records")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .eq("record_date", today)
    .single();

  if (existingRecord) {
    return { error: "오늘은 이미 인증을 완료했습니다." };
  }

  // 사진 직접 서버 업로드 지원 (클라이언트 RLS 제약 극복)
  if (photo && typeof photo === "object" && "arrayBuffer" in photo && photo.size > 0) {
    try {
      const fileExt = "jpg";
      const fileName = `${groupId}/${user.id}_${Date.now()}.${fileExt}`;
      const buffer = Buffer.from(await photo.arrayBuffer());

      const { error: uploadError } = await adminClient.storage
        .from("workout-photos")
        .upload(fileName, buffer, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("서버 스토리지 업로드 실패:", uploadError);
        return { error: `사진 업로드 실패: ${uploadError.message}` };
      }

      const { data: publicUrlData } = adminClient.storage
        .from("workout-photos")
        .getPublicUrl(fileName);

      imageUrl = publicUrlData.publicUrl;
      storagePath = fileName;
    } catch (err: any) {
      console.error("사진 처리 중 오류:", err);
      return { error: "사진 저장 중 오류가 발생했습니다." };
    }
  }

  if (!imageUrl || !storagePath) {
    return { error: "사진 파일 또는 이미지 경로가 필요합니다." };
  }

  // adminClient로 안전하게 workout_records에 추가
  const { error: insertError } = await adminClient.from("workout_records").insert({
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
    if (insertError.code === "23505") {
      return { error: "오늘은 이미 인증을 완료했습니다." };
    }
    return { error: "인증 기록 저장 중 오류가 발생했습니다." };
  }

  revalidatePath("/dashboard");
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

/**
 * 자신이 올린 인증 기록 삭제 액션
 */
export async function deleteWorkoutRecord(recordId: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 설정 오류" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };

  const adminClient = createAdminClient();
  if (!adminClient) return { error: "서버 설정 오류" };

  // 1. 레코드 조회 (본인 것인지 확인)
  const { data: record, error: fetchError } = await adminClient
    .from("workout_records")
    .select("id, user_id, storage_path")
    .eq("id", recordId)
    .single();

  if (fetchError || !record) {
    return { error: "해당 기록을 찾을 수 없습니다." };
  }

  if (record.user_id !== user.id) {
    return { error: "본인이 올린 기록만 삭제할 수 있습니다." };
  }

  // 2. 사진이 스토리지에 남아있다면 삭제
  if (record.storage_path) {
    await adminClient.storage.from("workout-photos").remove([record.storage_path]);
  }

  // 3. 레코드 삭제
  const { error: deleteError } = await adminClient
    .from("workout_records")
    .delete()
    .eq("id", recordId);

  if (deleteError) {
    return { error: "기록 삭제 중 오류가 발생했습니다." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
