import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type GroupAdminPageProps = {
  params: { groupId: string };
};

type MembershipRow = {
  role: "owner" | "admin" | "member";
  groups: { id: string; name: string } | Array<{ id: string; name: string }> | null;
};

type SettledMarketRow = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  winning_selection: string | null;
  status: "settled";
  closes_at: string;
  events: { title: string; group_id: string } | null;
};

type LedgerRow = {
  id: string;
  kind: "bet" | "payout" | "adjustment";
  amount: number;
  note: string | null;
  created_at: string;
  user_id: string;
};

type ProfileRow = {
  id: string;
  display_name: string;
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
  const member = membership as MembershipRow;
  if (member.role !== "owner" && member.role !== "admin") return notFound();
  const groupInfo = Array.isArray(member.groups) ? member.groups[0] : member.groups;

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

  const settled = (settledMarkets as SettledMarketRow[] | null) ?? [];
  const ledger = (ledgerRows as LedgerRow[] | null) ?? [];
  const userIds = Array.from(new Set(ledger.map((row) => row.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] as ProfileRow[] };
  const profileById = new Map(((profiles as ProfileRow[] | null) ?? []).map((p) => [p.id, p.display_name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{groupInfo?.name ?? "Group"} Admin</h1>
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
          {settled.length === 0 ? (
            <p className="text-sm text-muted-foreground">No settled markets yet.</p>
          ) : (
            settled.map((market) => (
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
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ledger entries yet.</p>
          ) : (
            ledger.map((row) => (
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
