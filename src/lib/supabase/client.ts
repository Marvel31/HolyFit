import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[HolyFit] Supabase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요."
    );
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
