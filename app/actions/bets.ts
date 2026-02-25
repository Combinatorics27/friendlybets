"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createEventAndMarket(formData: FormData) {
  const supabase = createClient();
  const groupId = String(formData.get("group_id") || "");
  const title = String(formData.get("title") || "").trim();
  const marketQuestion = String(formData.get("market_question") || "").trim();
  const optionA = String(formData.get("option_a") || "").trim();
  const optionB = String(formData.get("option_b") || "").trim();
  const closesAt = String(formData.get("closes_at") || "");

  if (!groupId || !title || !marketQuestion || !optionA || !optionB || !closesAt) {
    redirect(`/groups/${groupId}?error=All%20fields%20are%20required`);
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      group_id: groupId,
      title
    })
    .select("id")
    .single();

  if (eventError) {
    redirect(`/groups/${groupId}?error=${encodeURIComponent(eventError.message)}`);
  }

  const { error: marketError } = await supabase.from("markets").insert({
    event_id: event.id,
    question: marketQuestion,
    option_a: optionA,
    option_b: optionB,
    closes_at: closesAt
  });

  if (marketError) {
    redirect(`/groups/${groupId}?error=${encodeURIComponent(marketError.message)}`);
  }

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}?success=Event%20and%20market%20created`);
}

export async function placeBet(formData: FormData) {
  console.log("PLACE BET HIT");
  const supabase = createClient();
  const groupId = String(formData.get("group_id") || "");
  const marketId = String(formData.get("market_id") || "");
  const selection = String(formData.get("selection") || "").trim();
  const amount = Number(formData.get("amount") || 0);

  if (!groupId || !marketId || !selection || !amount || amount <= 0) {
    redirect(`/groups/${groupId}?error=Invalid%20bet%20input`);
  }

  const { error } = await supabase.rpc("place_bet", {
    p_market_id: marketId,
    p_selection: selection,
    p_amount: amount
  });

  if (error) {
    redirect(`/groups/${groupId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/history");
  revalidatePath("/leaderboard");
  revalidatePath("/analytics");
  redirect(`/groups/${groupId}?success=Bet%20placed`);
}

export async function settleMarket(formData: FormData) {
  const supabase = createClient();
  const groupId = String(formData.get("group_id") || "");
  const marketId = String(formData.get("market_id") || "");
  const winningSelection = String(formData.get("winning_selection") || "").trim();

  if (!groupId || !marketId || !winningSelection) {
    redirect(`/groups/${groupId}?error=Invalid%20settlement%20input`);
  }

  const { error } = await supabase.rpc("settle_market", {
    p_market_id: marketId,
    p_winning_selection: winningSelection
  });

  if (error) {
    redirect(`/groups/${groupId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/history");
  revalidatePath("/leaderboard");
  revalidatePath("/analytics");
  redirect(`/groups/${groupId}?success=Market%20settled`);
}
