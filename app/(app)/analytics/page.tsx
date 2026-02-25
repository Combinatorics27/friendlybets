import { BetVolumeChart } from "@/components/charts/bet-volume-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type DayPoint = {
  day: string;
  total: number;
};

export default async function AnalyticsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: ledger } = await supabase
    .from("ledger_entries")
    .select("amount, kind, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true });

  const dailyTotals = new Map<string, number>();

  (ledger ?? [])
    .filter((l: any) => l.kind === "bet")
    .forEach((entry: any) => {
      const day = new Date(entry.created_at).toISOString().slice(0, 10);
      dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + Number(entry.amount));
    });

  const chartData: DayPoint[] = Array.from(dailyTotals.entries()).map(([day, total]) => ({
    day,
    total
  }));

  const totalBet = (ledger ?? [])
    .filter((l: any) => l.kind === "bet")
    .reduce((sum: number, l: any) => sum + Number(l.amount), 0);

  const totalPayout = (ledger ?? [])
    .filter((l: any) => l.kind === "payout")
    .reduce((sum: number, l: any) => sum + Number(l.amount), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Bet Volume</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totalBet} pts</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Payout</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totalPayout} pts</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalPayout - totalBet} pts
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Daily Bet Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <BetVolumeChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
