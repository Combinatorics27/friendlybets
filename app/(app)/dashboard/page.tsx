import Link from "next/link";
import { createGroup, joinGroup } from "@/app/actions/groups";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type MembershipRow = {
  group_id: string;
  role: "owner" | "admin" | "member";
  balance: number;
};

type GroupRow = {
  id: string;
  name: string;
  invite_code: string;
};

type DashboardPageProps = {
  searchParams?: {
    error?: string;
    success?: string;
  };
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: memberships, error: membershipsError } = await supabase
    .from("group_members")
    .select("group_id, role, balance")
    .eq("user_id", user!.id);

  const membershipRows = (memberships as MembershipRow[] | null) ?? [];
  const groupIds = membershipRows.map((m) => m.group_id);
  const { data: groups, error: groupsError } = groupIds.length
    ? await supabase
        .from("groups")
        .select("id, name, invite_code")
        .in("id", groupIds)
    : { data: [] as GroupRow[], error: null };

  const groupRows = (groups as GroupRow[] | null) ?? [];
  const groupsById = new Map(groupRows.map((g) => [g.id, g]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Your Groups</h1>

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
      {membershipsError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load memberships: {membershipsError.message}
        </p>
      ) : null}
      {groupsError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load groups: {groupsError.message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Group</CardTitle>
            <CardDescription>Start a private group for your friends.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createGroup} className="space-y-3">
              <Input name="name" placeholder="Weekend Football Crew" required />
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join Group</CardTitle>
            <CardDescription>Enter invite code from a friend.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={joinGroup} className="space-y-3">
              <Input name="invite_code" placeholder="ABC123" required />
              <Button type="submit" variant="outline">
                Join
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Current Groups</h2>
        {membershipRows.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              You are not in any group yet. Create one or join with an invite code.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {membershipRows.map((m) => {
              const group = groupsById.get(m.group_id);
              return (
                <Card key={m.group_id}>
                  <CardHeader>
                    <CardTitle>{group?.name ?? "Unknown group"}</CardTitle>
                    <CardDescription>
                      Invite code:{" "}
                      <span className="font-mono">{group?.invite_code ?? "N/A"}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground capitalize">
                      {m.role} | {m.balance} pts
                    </p>
                    <Link href={`/groups/${m.group_id}`}>
                      <Button size="sm">Open</Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
