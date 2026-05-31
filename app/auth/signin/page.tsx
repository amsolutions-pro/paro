import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; verify?: string }>;
}) {
  const session = await auth();
  const { callbackUrl, error, verify } = await searchParams;

  if (session) redirect(callbackUrl ?? "/");

  const hasEmailProvider = !!process.env.RESEND_API_KEY;

  return (
    <div className="mx-auto mt-16 max-w-sm px-4">
      <div className="bg-grege-50 border border-grege-300 rounded-2xl p-8 shadow-sm flex flex-col gap-6 items-center">

        {/* Logo */}
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

        {/* Message après envoi du lien */}
        {verify && (
          <div className="w-full rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
            Vérifiez votre boîte mail — un lien de connexion vous a été envoyé.
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error === "EmailSignin"
              ? "Impossible d'envoyer l'email. Vérifiez l'adresse saisie."
              : "Une erreur est survenue. Veuillez réessayer."}
          </div>
        )}

        {/* Connexion par email (lien magique) */}
        {hasEmailProvider && !verify && (
          <>
            <form
              action={async (formData: FormData) => {
                "use server";
                const email = formData.get("email") as string;
                await signIn("resend", {
                  email,
                  redirectTo: callbackUrl ?? "/",
                });
              }}
              className="w-full flex flex-col gap-3"
            >
              <label htmlFor="email" className="text-xs font-medium text-encre">
                Adresse e-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="vous@exemple.com"
                className="w-full rounded-lg border border-grege-300 bg-white px-3 py-2 text-sm outline-none focus:border-lavande-500"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-lavande-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-lavande-600 transition-colors"
              >
                Recevoir un lien de connexion
              </button>
            </form>

            <div className="flex w-full items-center gap-3">
              <span className="flex-1 border-t border-grege-200" />
              <span className="text-xs text-encre-soft">ou</span>
              <span className="flex-1 border-t border-grege-200" />
            </div>
          </>
        )}

        {/* Connexion Google */}
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

        <p className="text-center text-xs text-encre-soft">
          Sans inscription, votre progression est sauvegardée localement sur cet appareil.
        </p>
      </div>
    </div>
  );
}
