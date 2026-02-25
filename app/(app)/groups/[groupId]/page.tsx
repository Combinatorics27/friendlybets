import Link from "next/link";
import { notFound } from "next/navigation";
import { createEventAndMarket, placeBet, settleMarket } from "@/app/actions/bets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

type GroupPageProps = {
  params: { groupId: string };
  searchParams?: {
    error?: string;
    success?: string;
  };
};

type MembershipRow = {
  group_id: string;
  role: "owner" | "admin" | "member";
  balance: number;
  groups:
    | { id: string; name: string; invite_code: string }
    | Array<{ id: string; name: string; invite_code: string }>
    | null;
};

type MarketRow = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  closes_at: string;
  status: "open" | "settled" | "cancelled";
  winning_selection: string | null;
};

type EventRow = {
  id: string;
  title: string;
  created_at: string;
  markets: MarketRow[] | null;
};

export default async function GroupPage({ params, searchParams }: GroupPageProps) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, role, balance, groups(id, name, invite_code)")
    .eq("group_id", params.groupId)
    .eq("user_id", user!.id)
    .single();

  if (!membership) return notFound();
  const member = membership as MembershipRow;
  const groupInfo = Array.isArray(member.groups) ? member.groups[0] : member.groups;

  const { data: events } = await supabase
    .from("events")
    .select("id, title, created_at, markets(id, question, option_a, option_b, closes_at, status, winning_selection)")
    .eq("group_id", params.groupId)
    .order("created_at", { ascending: false });

  const eventRows = (events as EventRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      {searchParams?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </p>
      ) : null}
      {searchParams?.success ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {searchParams.success}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{groupInfo?.name ?? "Group"}</h1>
          <p className="text-sm text-muted-foreground">
            Invite code: <span className="font-mono">{groupInfo?.invite_code ?? "N/A"}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(member.role === "owner" || member.role === "admin") && (
            <Link href={`/groups/${params.groupId}/admin`}>
              <Button variant="outline" size="sm">
                Admin
              </Button>
            </Link>
          )}
          <p className="rounded-md border px-3 py-2 text-sm">
            Wallet: <span className="font-semibold">{member.balance}</span> pts
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Event + Market</CardTitle>
          <CardDescription>Add one market quickly for your group.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createEventAndMarket} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="group_id" value={params.groupId} />
            <Input name="title" placeholder="Arsenal vs Liverpool" required />
            <Input name="market_question" placeholder="Who wins?" required />
            <Input name="option_a" placeholder="Arsenal" required />
            <Input name="option_b" placeholder="Liverpool" required />
            <Input name="closes_at" type="datetime-local" required />
            <Button type="submit" className="md:col-span-2">
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {eventRows.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle>{event.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(event.markets ?? []).map((market) => (
                <div key={market.id} className="rounded-lg border p-4">
                  <p className="font-medium">{market.question}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Closes: {new Date(market.closes_at).toLocaleString()} | Status:{" "}
                    <span className="font-medium">{market.status}</span>
                  </p>

                  {market.status === "open" ? (
                    <form action={placeBet} className="mt-3 grid gap-2 md:grid-cols-4">
                      <input type="hidden" name="group_id" value={params.groupId} />
                      <input type="hidden" name="market_id" value={market.id} />
                      <select
                        name="selection"
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        defaultValue={market.option_a}
                      >
                        <option value={market.option_a}>{market.option_a}</option>
                        <option value={market.option_b}>{market.option_b}</option>
                      </select>
                      <Input name="amount" type="number" min="1" placeholder="Amount" required />
                      <Button type="submit">Place Bet</Button>
                    </form>
                  ) : (
                    <p className="mt-2 text-sm">
                      Winner:{" "}
                      <span className="font-medium">{market.winning_selection ?? "Not settled"}</span>
                    </p>
                  )}

                  {(member.role === "owner" || member.role === "admin") &&
                  market.status === "open" ? (
                    <form action={settleMarket} className="mt-3 grid gap-2 md:grid-cols-4">
                      <input type="hidden" name="group_id" value={params.groupId} />
                      <input type="hidden" name="market_id" value={market.id} />
                      <select
                        name="winning_selection"
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        defaultValue={market.option_a}
                      >
                        <option value={market.option_a}>{market.option_a}</option>
                        <option value={market.option_b}>{market.option_b}</option>
                      </select>
                      <Button type="submit" variant="outline">
                        Settle Market
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
