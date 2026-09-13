import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * 백엔드 Cron 작업이나 백그라운드 배치 처리를 위한 Supabase Admin 클라이언트
 * 쿠키(사용자 세션)에 의존하지 않으며 서비스 롤 또는 Anon 키를 사용합니다.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // 서비스 롤 키가 있으면 최우선 사용, 없으면 Anon 키로 폴백
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "[HolyFit Admin] Supabase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요."
    );
    return null;
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
