import { getRequestConfig } from "next-intl/server";

/**
 * Configuration next-intl sans routage par préfixe d'URL :
 * l'interface est en français (FR par défaut) ; l'arménien (HY) est traité
 * comme une donnée de contenu (champs `translationHy`, items d'exercices),
 * pas comme une locale d'UI. Voir DECISIONS.md.
 */
export const locale = "fr" as const;

export default getRequestConfig(async () => {
  return {
    locale,
    messages: (await import(`../../../messages/${locale}.json`)).default,
  };
});
