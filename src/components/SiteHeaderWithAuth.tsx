import { auth, signIn, signOut } from "@/auth";
import { SiteHeader } from "./SiteHeader";

export async function SiteHeaderWithAuth() {
  const session = await auth();

  async function signInAction() {
    "use server";
    await signIn("google");
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <SiteHeader
      user={session?.user ?? null}
      signInAction={signInAction}
      signOutAction={signOutAction}
    />
  );
}
