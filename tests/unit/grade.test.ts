import { describe, it, expect } from "vitest";
import { grade } from "@/src/domain/grade";

describe("grade — QCM", () => {
  const sol = { correctKey: "b" };
  it("bonne réponse", () => expect(grade("QCM", { key: "b" }, sol).correct).toBe(true));
  it("mauvaise réponse", () => expect(grade("QCM", { key: "a" }, sol).correct).toBe(false));
  it("sans réponse", () => expect(grade("QCM", {}, sol).correct).toBe(false));
});

describe("grade — TROUS (normalisation accents)", () => {
  const sol = { answers: ["déceler"], accentSensitive: false };
  it("réponse exacte", () => expect(grade("TROUS", { answers: ["déceler"] }, sol).correct).toBe(true));
  it("sans accent accepté", () => expect(grade("TROUS", { answers: ["deceler"] }, sol).correct).toBe(true));
  it("casse insensible", () => expect(grade("TROUS", { answers: ["DÉCELER"] }, sol).correct).toBe(true));
  it("mauvais mot", () => expect(grade("TROUS", { answers: ["desceller"] }, sol).correct).toBe(false));
});

describe("grade — ANOMALIE", () => {
  const sol = { wrong: "sceptique", correct: "septique", accentSensitive: false };
  it("correct", () => expect(grade("ANOMALIE", { wrong: "sceptique", correct: "septique" }, sol).correct).toBe(true));
  it("wrong inversé", () => expect(grade("ANOMALIE", { wrong: "septique", correct: "sceptique" }, sol).correct).toBe(false));
  it("casse insensible", () => expect(grade("ANOMALIE", { wrong: "SCEPTIQUE", correct: "SEPTIQUE" }, sol).correct).toBe(true));
});

describe("grade — APPARIEMENT (paires)", () => {
  const sol = { pairs: { "1": "b", "2": "c", "3": "d" } };
  it("tout bon", () => expect(grade("APPARIEMENT", { pairs: { "1": "b", "2": "c", "3": "d" } }, sol).correct).toBe(true));
  it("une erreur", () => expect(grade("APPARIEMENT", { pairs: { "1": "b", "2": "d", "3": "c" } }, sol).correct).toBe(false));
});

describe("grade — VRAIFAUX", () => {
  it("vrai attendu / vrai donné", () => expect(grade("VRAIFAUX", { value: true }, { value: true }).correct).toBe(true));
  it("faux attendu / vrai donné", () => expect(grade("VRAIFAUX", { value: true }, { value: false }).correct).toBe(false));
  it("valeur null → incorrect", () => expect(grade("VRAIFAUX", { value: null }, { value: true }).correct).toBe(false));
});

describe("grade — HOMOPHONIE (accent significatif)", () => {
  const sol = { answer: "session", accentSensitive: true };
  it("exact", () => expect(grade("HOMOPHONIE", { text: "session" }, sol).correct).toBe(true));
  it("cession rejeté", () => expect(grade("HOMOPHONIE", { text: "cession" }, sol).correct).toBe(false));
});

describe("grade — DEVINETTE (accept list)", () => {
  const sol = { answer: "émigrant", accept: ["émigrant", "émigré"], accentSensitive: false };
  it("canonical", () => expect(grade("DEVINETTE", { text: "émigrant" }, sol).correct).toBe(true));
  it("alternative", () => expect(grade("DEVINETTE", { text: "émigré" }, sol).correct).toBe(true));
  it("mauvais", () => expect(grade("DEVINETTE", { text: "immigrant" }, sol).correct).toBe(false));
});

describe("grade — CATEGORISATION", () => {
  const sol = { assign: { addiction: "NOM_F", différend: "NOM_M", spécieux: "ADJECTIF" } };
  it("tout bon", () => expect(grade("CATEGORISATION", { assign: { addiction: "NOM_F", différend: "NOM_M", spécieux: "ADJECTIF" } }, sol).correct).toBe(true));
  it("erreur sur un mot", () => expect(grade("CATEGORISATION", { assign: { addiction: "NOM_M", différend: "NOM_M", spécieux: "ADJECTIF" } }, sol).correct).toBe(false));
});

describe("grade — TEXTE_LACUNAIRE", () => {
  const sol = { answers: ["session", "différend", "adduction"], accentSensitive: false };
  it("tout bon", () => expect(grade("TEXTE_LACUNAIRE", { answers: ["session", "différend", "adduction"] }, sol).correct).toBe(true));
  it("une erreur", () => expect(grade("TEXTE_LACUNAIRE", { answers: ["session", "différent", "adduction"] }, sol).correct).toBe(false));
});
