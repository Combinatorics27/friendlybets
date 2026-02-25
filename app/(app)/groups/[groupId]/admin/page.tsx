import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type GroupAdminPageProps = {
  params: { groupId: string };
};

export default async function GroupAdminPage({ params }: GroupAdminPageProps) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("group_members")
    .select("role, groups(id, name)")
    .eq("group_id", params.groupId)
    .eq("user_id", user!.id)
    .single();

  if (!membership) return notFound();
  if (membership.role !== "owner" && membership.role !== "admin") return notFound();

  const { data: settledMarkets } = await supabase
    .from("markets")
    .select(
      "id, question, option_a, option_b, winning_selection, status, closes_at, events!inner(title, group_id)"
    )
    .eq("status", "settled")
    .eq("events.group_id", params.groupId)
    .order("closes_at", { ascending: false });

  const { data: ledgerRows } = await supabase
    .from("ledger_entries")
    .select("id, kind, amount, note, created_at, user_id")
    .eq("group_id", params.groupId)
    .order("created_at", { ascending: false })
    .limit(200);

  const userIds = Array.from(new Set((ledgerRows ?? []).map((row: any) => row.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] as any[] };
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{membership.groups.name} Admin</h1>
          <p className="text-sm text-muted-foreground">Audit settled markets and ledger entries.</p>
        </div>
        <Link href={`/groups/${params.groupId}`}>
          <Button variant="outline">Back to Group</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settled Markets</CardTitle>
          <CardDescription>Recent outcomes for this group.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(settledMarkets ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No settled markets yet.</p>
          ) : (
            settledMarkets.map((market: any) => (
              <div key={market.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{market.question}</p>
                <p className="text-muted-foreground">{market.events?.title ?? "Unknown event"}</p>
                <p className="mt-1">
                  Winner: <span className="font-medium">{market.winning_selection}</span>
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
          <CardDescription>Latest balance movements in this group.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(ledgerRows ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No ledger entries yet.</p>
          ) : (
            ledgerRows.map((row: any) => (
              <div key={row.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">
                  {row.kind} | {row.amount} pts
                </p>
                <p className="text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()} |{" "}
                  {profileById.get(row.user_id) ?? "Unknown user"}
                </p>
                {row.note ? <p className="mt-1">{row.note}</p> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
