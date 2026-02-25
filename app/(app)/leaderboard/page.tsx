import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function LeaderboardPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: myMemberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user!.id);

  const groupIds = (myMemberships ?? []).map((m: any) => m.group_id);

  const { data: leaderboard } = await supabase
    .from("group_members")
    .select("group_id, balance, profiles(display_name), groups(name)")
    .in("group_id", groupIds)
    .order("balance", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Leaderboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Top balances across your groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(leaderboard ?? []).map((row: any, index: number) => (
            <div
              key={`${row.group_id}-${index}`}
              className="flex items-center justify-between rounded-md border p-3 text-sm"
            >
              <div>
                <p className="font-medium">{row.profiles?.display_name ?? "Unknown User"}</p>
                <p className="text-muted-foreground">{row.groups?.name}</p>
              </div>
              <p className="font-semibold">{row.balance} pts</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
