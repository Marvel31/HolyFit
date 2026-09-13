import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/onboarding");
  }

  // Get user's groups with membership info
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
        penalty_amount
      )
    `)
    .eq("user_id", user.id);

  // Flatten groups
  const groups = (memberships ?? [])
    .filter((m) => m.groups)
    .map((m) => {
      const g = (Array.isArray(m.groups) ? m.groups[0] : m.groups) as {
        id: string;
        name: string;
        description: string | null;
        invite_code: string;
        weekly_target_count: number;
        penalty_amount: number;
      };
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        invite_code: g.invite_code,
        weekly_target_count: g.weekly_target_count,
        penalty_amount: g.penalty_amount,
        role: m.role,
      };
    });

  return (
    <DashboardClient
      profile={profile}
      groups={groups}
    />
  );
}
