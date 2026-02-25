import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/auth-buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Friendly Betting</CardTitle>
          <CardDescription>
            Private points-based betting for you and your friends.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <SignInButton />
          <Link href="#" className="text-sm text-muted-foreground">
            Google OAuth via Supabase
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
