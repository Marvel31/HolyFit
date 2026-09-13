import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * 7일 경과된 운동 사진을 Supabase Storage에서 일괄 삭제하고
 * DB 레코드를 is_photo_deleted = true, image_url = null로 갱신하는 Cron 엔드포인트
 */
export async function GET(request: Request) {
  return handleCleanup(request);
}

export async function POST(request: Request) {
  return handleCleanup(request);
}

async function handleCleanup(request: Request) {
  try {
    // 선택적 보안 검증: CRON_SECRET 환경변수가 설정되어 있다면 Bearer token 검증
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        message:
          "[Dev Mode] Supabase 환경변수가 설정되지 않았습니다. 만료 정리 루틴이 안전하게 스킵되었습니다.",
        deletedCount: 0,
      });
    }

    const now = new Date().toISOString();

    // 1. 만료 대상 레코드 조회 (photo_expires_at < NOW() AND is_photo_deleted = false)
    const { data: expiredRecords, error: fetchError } = await supabase
      .from("workout_records")
      .select("id, storage_path, photo_expires_at")
      .lt("photo_expires_at", now)
      .eq("is_photo_deleted", false)
      .limit(100); // 1회 최대 100건씩 배치 처리

    if (fetchError) {
      console.error("만료 사진 조회 실패:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expiredRecords || expiredRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: "만료된 사진이 없습니다.",
        deletedCount: 0,
      });
    }

    const storagePathsToDelete = expiredRecords
      .map((r) => r.storage_path)
      .filter((p): p is string => Boolean(p));

    const recordIdsToUpdate = expiredRecords.map((r) => r.id);

    // 2. Supabase Storage에서 파일 삭제
    let storageDeletedCount = 0;
    if (storagePathsToDelete.length > 0) {
      const { data: deleteData, error: storageError } = await supabase.storage
        .from("workout-photos")
        .remove(storagePathsToDelete);

      if (storageError) {
        console.warn("Storage 파일 삭제 중 일부 오류:", storageError);
      } else {
        storageDeletedCount = deleteData?.length || storagePathsToDelete.length;
      }
    }

    // 3. DB 업데이트: is_photo_deleted = true, image_url = null
    const { error: updateError } = await supabase
      .from("workout_records")
      .update({
        is_photo_deleted: true,
        image_url: null,
      })
      .in("id", recordIdsToUpdate);

    if (updateError) {
      console.error("DB 만료 상태 업데이트 실패:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${recordIdsToUpdate.length}건의 만료 사진이 안전하게 정리되었습니다.`,
      deletedCount: recordIdsToUpdate.length,
      storageDeletedCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("사진 만료 처리 예외 발생:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
