import { signOut } from "@/app/(auth)/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button className="btn ghost sm" type="submit">Se déconnecter</button>
    </form>
  );
}
