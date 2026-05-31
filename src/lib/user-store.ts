"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Identité locale : userId anonyme généré au premier lancement et persisté
 * en localStorage. Suffisant pour sauvegarder toute la progression sans
 * authentification (cf. §6 — mode local).
 */
interface UserStore {
  userId: string;
}

function generateId() {
  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useUserStore = create<UserStore>()(
  persist(
    () => ({ userId: "" }),
    {
      name: "paro-user",
      version: 1,
      // Génère l'id seulement si le storage n'en contenait pas — évite que
      // la valeur par défaut écrase une identité déjà persistée (course de
      // réhydratation SSR/CSR).
      onRehydrateStorage: () => (state) => {
        if (state && !state.userId) state.userId = generateId();
      },
    },
  ),
);

export function getUserId(): string {
  let id = useUserStore.getState().userId;
  if (!id) {
    id = generateId();
    useUserStore.setState({ userId: id });
  }
  return id;
}
