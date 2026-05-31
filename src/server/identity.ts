import { auth } from "@/auth";

/**
 * Identité effective pour les routes API.
 *
 * Règle : si l'utilisateur est authentifié, on utilise TOUJOURS l'id de session
 * (cuid du compte). Sinon on retombe sur l'id anonyme fourni par le client
 * (localStorage `paro-user`). Cela ferme l'IDOR pour les comptes authentifiés
 * tout en préservant le mode anonyme local.
 *
 * @param provided  id anonyme transmis par le client (query/body), facultatif.
 * @returns         id effectif, ou null si aucune identité disponible.
 */
export async function getEffectiveUserId(
  provided?: string | null,
): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;
  return provided && provided.length > 0 ? provided : null;
}
