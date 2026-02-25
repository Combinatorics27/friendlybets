"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const displayName = String(formData.get("display_name") || "").trim();
  const avatarUrl = String(formData.get("avatar_url") || "").trim();

  if (!displayName) {
    redirect("/settings?error=Display%20name%20is%20required");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/settings?error=Unauthorized");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      avatar_url: avatarUrl || null
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  revalidatePath("/leaderboard");
  redirect("/settings?success=Profile%20updated");
}
