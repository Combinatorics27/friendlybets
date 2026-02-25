import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

type SettingsPageProps = {
  searchParams?: {
    error?: string;
    success?: string;
  };
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user!.id)
    .single();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

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

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Used in leaderboard and group activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="grid gap-3 md:max-w-xl">
            <Input
              name="display_name"
              placeholder="Display name"
              defaultValue={profile?.display_name ?? ""}
              required
            />
            <Input
              name="avatar_url"
              placeholder="Avatar URL (optional)"
              defaultValue={profile?.avatar_url ?? ""}
            />
            <Button type="submit" className="w-fit">
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
