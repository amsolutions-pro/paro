import { auth, signIn, signOut } from "@/auth";
import { SiteHeader } from "./SiteHeader";
import { IdentityMerge } from "./IdentityMerge";

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
    <>
      {session?.user ? <IdentityMerge /> : null}
      <SiteHeader
        user={session?.user ?? null}
        signInAction={signInAction}
        signOutAction={signOutAction}
      />
    </>
  );
}
