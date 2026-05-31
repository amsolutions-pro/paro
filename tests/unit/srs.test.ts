import { describe, it, expect } from "vitest";
import {
  updateSrs,
  initialSrsState,
  isDue,
  sortByPriority,
  LEITNER_INTERVALS,
  SRS_UNIT,
} from "@/src/domain/srs";

const NOW = new Date("2026-01-01T12:00:00Z");
const MS_PER_UNIT = SRS_UNIT === "hours" ? 3_600_000 : 86_400_000;
const tomorrow = (n = 1) => new Date(NOW.getTime() + n * MS_PER_UNIT);

describe("initialSrsState", () => {
  it("box = 1, ease = 2.5", () => {
    const s = initialSrsState(NOW);
    expect(s.box).toBe(1);
    expect(s.ease).toBe(2.5);
    expect(s.lapses).toBe(0);
    expect(s.intervalDays).toBe(LEITNER_INTERVALS[1]);
  });
});

describe("updateSrs — réponse correcte", () => {
  it("monte d'une boîte", () => {
    const s = initialSrsState(NOW);
    const s2 = updateSrs(s, "correct", NOW);
    expect(s2.box).toBe(2);
  });

  it("ne dépasse pas la boîte 5", () => {
    const s = { ...initialSrsState(NOW), box: 5 as const };
    const s2 = updateSrs(s, "correct", NOW);
    expect(s2.box).toBe(5);
  });

  it("ease augmente (+0.1), plafonné à 2.5", () => {
    const s = { ...initialSrsState(NOW), ease: 2.45 };
    const s2 = updateSrs(s, "correct", NOW);
    expect(s2.ease).toBeCloseTo(2.5, 5);
  });

  it("nextReview = now + intervalle[box+1]", () => {
    const s = initialSrsState(NOW); // box=1
    const s2 = updateSrs(s, "correct", NOW); // box=2, interval=3
    const expectedDate = tomorrow(LEITNER_INTERVALS[2]);
    expect(s2.nextReview.toDateString()).toBe(expectedDate.toDateString());
  });

  it("lapses inchangé sur bonne réponse", () => {
    const s = { ...initialSrsState(NOW), lapses: 2 };
    expect(updateSrs(s, "correct", NOW).lapses).toBe(2);
  });
});

describe("updateSrs — réponse incorrecte", () => {
  it("retombe en boîte 1", () => {
    const s = { ...initialSrsState(NOW), box: 4 as const };
    const s2 = updateSrs(s, "incorrect", NOW);
    expect(s2.box).toBe(1);
  });

  it("lapses incrémenté", () => {
    const s = initialSrsState(NOW);
    const s2 = updateSrs(s, "incorrect", NOW);
    expect(s2.lapses).toBe(1);
  });

  it("ease diminue (−0.2), plancher 1.3", () => {
    const s = { ...initialSrsState(NOW), ease: 1.4 };
    const s2 = updateSrs(s, "incorrect", NOW);
    expect(s2.ease).toBeCloseTo(1.3, 5);
  });

  it("plancher ease = 1.3 respecté", () => {
    const s = { ...initialSrsState(NOW), ease: 1.3 };
    const s2 = updateSrs(s, "incorrect", NOW);
    expect(s2.ease).toBeCloseTo(1.3, 5);
  });
});

describe("isDue", () => {
  it("due si nextReview dans le passé", () => {
    const s = { ...initialSrsState(NOW), nextReview: new Date(NOW.getTime() - 1000) };
    expect(isDue(s, NOW)).toBe(true);
  });

  it("pas due si dans le futur", () => {
    const s = { ...initialSrsState(NOW), nextReview: tomorrow(5) };
    expect(isDue(s, NOW)).toBe(false);
  });
});

describe("sortByPriority", () => {
  it("trie par lapses décroissants d'abord", () => {
    const s1 = { ...initialSrsState(NOW), lapses: 1 };
    const s2 = { ...initialSrsState(NOW), lapses: 5 };
    const s3 = { ...initialSrsState(NOW), lapses: 3 };
    const sorted = sortByPriority([s1, s2, s3]);
    expect(sorted[0].lapses).toBe(5);
    expect(sorted[1].lapses).toBe(3);
    expect(sorted[2].lapses).toBe(1);
  });

  it("à lapses égaux, trie par nextReview croissant", () => {
    const s1 = { ...initialSrsState(NOW), lapses: 2, nextReview: tomorrow(5) };
    const s2 = { ...initialSrsState(NOW), lapses: 2, nextReview: tomorrow(1) };
    const sorted = sortByPriority([s1, s2]);
    expect(sorted[0].nextReview).toEqual(s2.nextReview);
  });
});
