import { signInWithGoogle, signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  return (
    <form action={signInWithGoogle}>
      <Button type="submit">Continue with Google</Button>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="outline">
        Sign out
      </Button>
    </form>
  );
}
