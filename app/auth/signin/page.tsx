import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  // Deja connecte — rediriger
  if (session) redirect(callbackUrl ?? "/");

  return (
    <div className="mx-auto mt-16 max-w-sm px-4">
      <div className="bg-grege-50 border border-grege-300 rounded-2xl p-8 shadow-sm flex flex-col gap-6 items-center">

        {/* Rose icon */}
        <div className="flex flex-col items-center gap-2">
          <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M50 92 Q48 80 50 68" stroke="#2e7d32" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            <path d="M50 78 Q38 70 36 58 Q44 66 50 78" fill="#4caf50"/>
            <path d="M50 74 Q62 66 64 54 Q56 62 50 74" fill="#4caf50"/>
            <ellipse cx="50" cy="36" rx="14" ry="20" fill="#e8294a" transform="rotate(0,50,52)"/>
            <ellipse cx="50" cy="36" rx="14" ry="20" fill="#e8294a" transform="rotate(72,50,52)"/>
            <ellipse cx="50" cy="36" rx="14" ry="20" fill="#e8294a" transform="rotate(144,50,52)"/>
            <ellipse cx="50" cy="36" rx="14" ry="20" fill="#e8294a" transform="rotate(216,50,52)"/>
            <ellipse cx="50" cy="36" rx="14" ry="20" fill="#e8294a" transform="rotate(288,50,52)"/>
            <circle cx="50" cy="52" r="12" fill="#9a0820"/>
          </svg>
          <h1 className="font-serif text-2xl font-bold text-encre">Paronymes FR–HY</h1>
          <p className="text-sm text-encre-soft text-center">Connectez-vous pour sauvegarder votre progression</p>
        </div>

        {/* Bouton Google */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl ?? "/" });
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-grege-300 bg-white px-4 py-2.5 text-sm font-medium text-encre shadow-sm hover:bg-grege-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </button>
        </form>

        {/* Bouton Facebook — affiché uniquement si le provider est configuré */}
        {process.env.FACEBOOK_CLIENT_ID && (
          <form
            action={async () => {
              "use server";
              await signIn("facebook", { redirectTo: callbackUrl ?? "/" });
            }}
            className="w-full"
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-grege-300 bg-[#1877F2] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#166fe5] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden>
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
              </svg>
              Continuer avec Facebook
            </button>
          </form>
        )}

        <p className="text-center text-xs text-encre-soft">
          Sans inscription, votre progression est sauvegardée localement sur cet appareil.
        </p>
      </div>
    </div>
  );
}
