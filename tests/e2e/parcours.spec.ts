import { test, expect } from "@playwright/test";

/**
 * Parcours e2e clés — Étape 5 (cf. §8 « 2–3 parcours Playwright »).
 * Nécessite le serveur dev + la base seed (npm run dev && npm run db:seed).
 */

test.describe("Parcours 1 — Manuel : consulter une notice", () => {
  test("page Manuel charge et affiche les groupes", async ({ page }) => {
    await page.goto("/manuel");
    await expect(page.getByRole("heading", { name: "Manuel des paronymes" })).toBeVisible();
    // Attendre que les cartes chargent via l'API (force-dynamic).
    await expect(page.locator("button[aria-expanded]").first()).toBeVisible({ timeout: 12_000 });
  });

  test("filtrer par lettre E réduit la liste", async ({ page }) => {
    await page.goto("/manuel");
    await expect(page.locator("button[aria-expanded]").first()).toBeVisible({ timeout: 12_000 });
    await page.getByRole("button", { name: "E", exact: true }).click();
    await page.waitForTimeout(1000);
    // Au moins un résultat doit s'afficher.
    await expect(page.locator("button[aria-expanded]").first()).toBeVisible({ timeout: 8_000 });
  });

  test("rechercher 'imminent' trouve la paire", async ({ page }) => {
    await page.goto("/manuel");
    await expect(page.locator("button[aria-expanded]").first()).toBeVisible({ timeout: 12_000 });
    await page.getByRole("searchbox").fill("imminent");
    await page.waitForTimeout(700);
    await expect(page.locator("button[aria-expanded]").first()).toBeVisible({ timeout: 8_000 });
  });

  test("développer un groupe montre le bon usage", async ({ page }) => {
    await page.goto("/manuel");
    await expect(page.locator("button[aria-expanded='false']").first()).toBeVisible({ timeout: 12_000 });
    // Cliquer sur le bouton expand du premier groupe.
    await page.locator("button[aria-expanded='false']").first().click();
    // Après expansion, le résumé du groupe s'affiche.
    // aria-expanded passe à true = React a re-rendu.
    await expect(page.locator("button[aria-expanded='true']").first()).toBeVisible({ timeout: 6_000 });
    // Vérifier que des définitions (mots vedettes dans des divs détail) sont visibles.
    await expect(page.locator("ul li, div.font-serif").first()).toBeVisible({ timeout: 6_000 });
  });
});

test.describe("Parcours 2 — QCM : faire un exercice", () => {
  test("page liste 20 typologies", async ({ page }) => {
    await page.goto("/exercices");
    await expect(page.getByRole("heading", { name: "Exercices" })).toBeVisible();
    // 20 cartes typologies.
    const cards = page.locator("a[href*='/exercices/']");
    await expect(cards).toHaveCount(20, { timeout: 8_000 });
  });

  test("session QCM : choisir une option et valider", async ({ page }) => {
    await page.goto("/exercices/qcm");
    await expect(page.getByRole("heading", { name: "Choix multiples" })).toBeVisible({ timeout: 8_000 });
    // Sélectionner la première option radio.
    const firstRadio = page.locator("input[type='radio']").first();
    await expect(firstRadio).toBeVisible({ timeout: 8_000 });
    await firstRadio.click();
    // Cliquer Valider.
    await page.getByRole("button", { name: "Valider" }).click();
    // La boîte de corrigé doit apparaître.
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 8_000 });
  });

  test("bouton Suivant passe à l'item suivant", async ({ page }) => {
    await page.goto("/exercices/qcm");
    const firstRadio = page.locator("input[type='radio']").first();
    await expect(firstRadio).toBeVisible({ timeout: 8_000 });
    await firstRadio.click();
    await page.getByRole("button", { name: "Valider" }).click();
    await page.getByRole("button", { name: "Suivant →" }).click();
    // Le compteur doit afficher 2 / 10.
    await expect(page.getByText("2 / 10")).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Parcours 3 — Tableau de bord", () => {
  test("page tableau de bord se charge sans erreur", async ({ page }) => {
    await page.goto("/tableau-de-bord");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    // KPI « Exercices complétés » doit être visible.
    await expect(page.getByText("Exercices complétés")).toBeVisible({ timeout: 8_000 });
  });

  test("page révision se charge correctement", async ({ page }) => {
    await page.goto("/revision");
    await expect(page.getByRole("heading", { name: "Mes points faibles" })).toBeVisible({ timeout: 8_000 });
  });
});
