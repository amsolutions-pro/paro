import { auth, signIn, signOut } from "@/auth";
import { SiteHeader } from "./SiteHeader";
import { IdentityMerge } from "./IdentityMerge";
import { GeoCheckinClient } from "./GeoCheckinClient";
import { OnboardingNudge } from "./OnboardingNudge";

export async function SiteHeaderWithAuth() {
  const session = await auth();
  const isAuthed = !!session?.user?.id;

  async function signInAction() {
    "use server";
    await signIn("google");
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/exercices" });
  }

  return (
    <>
      {session?.user ? <IdentityMerge /> : null}
      <GeoCheckinClient isAuthed={isAuthed} />
      <OnboardingNudge isAuthed={isAuthed} />
      <SiteHeader
        user={session?.user ?? null}
        signInAction={signInAction}
        signOutAction={signOutAction}
      />
    </>
  );
}
