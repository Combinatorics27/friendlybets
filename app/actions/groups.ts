"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createGroup(formData: FormData) {
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    redirect("/dashboard?error=Group%20name%20is%20required");
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    redirect("/dashboard?error=Unauthorized");
  }

  const { error } = await supabase.rpc("create_group", {
    p_name: name
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?success=Group%20created");
}

export async function joinGroup(formData: FormData) {
  const supabase = createClient();
  const inviteCode = String(formData.get("invite_code") || "")
    .trim()
    .toUpperCase();

  if (!inviteCode) {
    redirect("/dashboard?error=Invite%20code%20is%20required");
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    redirect("/dashboard?error=Unauthorized");
  }

  const { error } = await supabase.rpc("join_group_by_code", {
    p_invite_code: inviteCode
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?success=Joined%20group");
}
