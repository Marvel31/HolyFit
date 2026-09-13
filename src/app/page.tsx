import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LandingClient from "./landing-client";

export default async function HomePage() {
  const supabase = await createClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Check if user has profile
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (profile) {
        redirect("/dashboard");
      } else {
        redirect("/onboarding");
      }
    }
  }

  return <LandingClient />;
}
