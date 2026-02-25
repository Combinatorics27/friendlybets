import Link from "next/link";
import { SignOutButton } from "@/components/auth-buttons";

export function AppNav() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="font-semibold">
          Friendly Betting
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard">Groups</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/history">History</Link>
          <Link href="/analytics">Analytics</Link>
          <Link href="/settings">Settings</Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
