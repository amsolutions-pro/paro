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
    () => ({ userId: generateId() }),
    { name: "paro-user" },
  ),
);

export function getUserId(): string {
  return useUserStore.getState().userId;
}
