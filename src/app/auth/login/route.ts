import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 모바일 브라우저의 팝업/비동기 차단 정책을 100% 우회하는 OAuth 리디렉션 엔드포인트
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "192.168.219.120:3000";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const origin = `${proto}://${host}`;

  const provider = searchParams.get("provider") as "google" | "kakao" | null;

  if (!provider || (provider !== "google" && provider !== "kakao")) {
    return NextResponse.redirect(`${origin}/login?error=invalid_provider`);
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=supabase_not_configured`);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data?.url) {
    console.error("OAuth redirect URL 생성 실패:", error);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error?.message || "oauth_failed")}`
    );
  }

  // 브라우저에 303/307 리디렉션 응답을 반환하여 모바일에서도 즉시 이동
  return NextResponse.redirect(data.url);
}
