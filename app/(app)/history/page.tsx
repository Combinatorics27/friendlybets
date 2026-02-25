import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type BetRow = {
  id: string;
  amount: number;
  selection: string;
  created_at: string;
  result: "pending" | "won" | "lost" | "void";
  markets: { question: string | null } | null;
  groups: { name: string | null } | null;
};

export default async function HistoryPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: bets } = await supabase
    .from("bets")
    .select("id, amount, selection, created_at, result, markets(question), groups(name)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (bets as BetRow[] | null) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Bet History</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your latest bets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((bet) => (
            <div key={bet.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{bet.markets?.question}</p>
              <p className="text-muted-foreground">
                {new Date(bet.created_at).toLocaleString()} | {bet.groups?.name}
              </p>
              <p className="mt-1">
                Selection: <span className="font-medium">{bet.selection}</span> | Amount:{" "}
                <span className="font-medium">{bet.amount}</span> pts | Result:{" "}
                <span className="font-medium">{bet.result}</span>
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
