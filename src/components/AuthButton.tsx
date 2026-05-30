"use client";

import { useTransition } from "react";
import Image from "next/image";

interface AuthButtonProps {
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
  signInAction: () => Promise<void>;
  signOutAction: () => Promise<void>;
}

export function AuthButton({ user, signInAction, signOutAction }: AuthButtonProps) {
  const [pending, startTransition] = useTransition();

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.image && (
          <Image
            src={user.image}
            alt={user.name ?? "avatar"}
            width={28}
            height={28}
            className="rounded-full border border-grege-300"
          />
        )}
        <button
          disabled={pending}
          onClick={() => startTransition(signOutAction)}
          className="text-encre-soft hover:text-encre text-xs font-medium transition-colors"
        >
          Déconnexion
        </button>
      </div>
    );
  }

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(signInAction)}
      className="rounded-md bg-lavande-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-lavande-600 transition-colors disabled:opacity-50"
    >
      Se connecter
    </button>
  );
}
