"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createUserProfile(formData: FormData) {
  const nickname = (formData.get("nickname") as string)?.trim();

  if (!nickname || nickname.length < 2 || nickname.length > 12) {
    redirect("/onboarding?error=" + encodeURIComponent("닉네임은 2~12자 사이로 입력해주세요."));
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/login?error=" + encodeURIComponent("Supabase 설정 오류"));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check nickname uniqueness
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("nickname", nickname)
    .single();

  if (existing) {
    redirect("/onboarding?error=" + encodeURIComponent("이미 사용 중인 닉네임입니다."));
  }

  // Create profile
  const { error } = await supabase.from("users").insert({
    id: user.id,
    email: user.email,
    nickname: nickname,
    profile_image: user.user_metadata?.avatar_url ?? null,
  });

  if (error) {
    console.error("프로필 생성 실패:", error);
    redirect("/onboarding?error=" + encodeURIComponent("프로필 생성 중 오류: " + error.message));
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/login");
}
