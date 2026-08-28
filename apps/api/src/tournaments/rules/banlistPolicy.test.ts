import { banlistAsOf } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import {
  banlistDateForSet,
  banlistDateOf,
  normalizeBanlistPolicy,
  resolveBanlistPolicy,
  UnknownBanlistSetError,
} from "./banlistPolicy.js";

const BT6_RELEASE = "2021-10-15";
const BT7_RELEASE = "2022-03-04";
const BT10_RELEASE = "2022-10-14";

function statusOf(cards: ReturnType<typeof resolveBanlistPolicy>, cardId: string) {
  return cards.find((card) => card.cardId === cardId);
}

describe("resolveBanlistPolicy", () => {
  it("resolves mode none to an empty frozen list", () => {
    expect(resolveBanlistPolicy({ mode: "none" }, Date.parse("2025-06-01"))).toEqual([]);
  });

  it("resolves mode current at the creation date, not at today", () => {
    const createdAt = Date.parse("2022-03-01T12:00:00Z");
    const cards = resolveBanlistPolicy({ mode: "current" }, createdAt);
    // Mega Digimon Fusion! was banned on 2022-02-25, before this event was created.
    expect(statusOf(cards, "BT5-109")).toEqual({ cardId: "BT5-109", status: "banned", allowedCopies: 0 });
    // Matt Ishida is banned only from 2025-03-28, so a 2022 event never saw it.
    expect(statusOf(cards, "BT2-090")).toBeUndefined();
  });

  it("resolves mode as_of_set at the set's release date", () => {
    const createdAt = Date.parse("2026-01-01");
    const atBt6 = resolveBanlistPolicy({ mode: "as_of_set", setId: "BT6" }, createdAt);
    const atBt10 = resolveBanlistPolicy({ mode: "as_of_set", setId: "BT10" }, createdAt);
    expect(banlistDateForSet("BT6")).toBe(BT6_RELEASE);
    expect(banlistDateForSet("BT10")).toBe(BT10_RELEASE);
    // Argomon has been restricted to one copy since 2021-04-01, so both eras carry it.
    expect(statusOf(atBt6, "BT2-047")).toEqual({ cardId: "BT2-047", status: "restricted", allowedCopies: 1 });
    // Mega Digimon Fusion! was banned on 2022-02-25, between the two releases.
    expect(statusOf(atBt6, "BT5-109")).toBeUndefined();
    expect(statusOf(atBt10, "BT5-109")).toEqual({ cardId: "BT5-109", status: "banned", allowedCopies: 0 });
  });

  it("ignores the creation date entirely for as_of_set", () => {
    const early = resolveBanlistPolicy({ mode: "as_of_set", setId: "BT7" }, Date.parse(BT7_RELEASE));
    const late = resolveBanlistPolicy({ mode: "as_of_set", setId: "BT7" }, Date.parse("2026-08-12"));
    expect(early).toEqual(late);
  });

  it("keeps a lifted restriction out of a list resolved after the lift", () => {
    const createdAt = Date.parse("2026-01-01");
    const beforeLift = resolveBanlistPolicy({ mode: "as_of_set", setId: "BT10" }, createdAt);
    const afterLift = resolveBanlistPolicy({ mode: "current" }, Date.parse("2024-01-01"));
    // SaviorHuckmon was restricted in 2021 and lifted on 2023-11-17.
    expect(statusOf(beforeLift, "BT6-015")?.status).toBe("restricted");
    expect(statusOf(afterLift, "BT6-015")).toBeUndefined();
  });

  it("leaves a banned-pair card at its printed limit, because it is illegal only next to its partner", () => {
    const cards = resolveBanlistPolicy({ mode: "current" }, Date.parse("2025-06-01"));
    expect(statusOf(cards, "EX2-007")).toEqual({
      cardId: "EX2-007",
      status: "banned_pair",
      allowedCopies: 4,
      pairPartnerIds: ["EX7-064"],
    });
  });

  it("carries the pair partners in force at the frozen date, so the snapshot needs no live table", () => {
    // Chaosmon: Valdur Arm's pair lands on 2025-09-01, after Mother D-Reaper's on 2025-03-28.
    const beforeSecondPair = resolveBanlistPolicy({ mode: "current" }, Date.parse("2025-06-01"));
    const afterSecondPair = resolveBanlistPolicy({ mode: "current" }, Date.parse("2025-10-01"));
    expect(statusOf(beforeSecondPair, "BT20-037")).toBeUndefined();
    expect(statusOf(afterSecondPair, "BT20-037")?.pairPartnerIds).toEqual(["BT17-035", "EX8-037"]);
    // A pair added after the freeze date cannot reach back into the older snapshot.
    expect(statusOf(beforeSecondPair, "EX2-007")?.pairPartnerIds).toEqual(["EX7-064"]);
    expect(statusOf(afterSecondPair, "EX2-007")?.pairPartnerIds).toEqual(["EX7-064"]);
  });

  it("records the partner symmetrically on both halves of a pair", () => {
    const cards = resolveBanlistPolicy({ mode: "current" }, Date.parse("2025-06-01"));
    expect(statusOf(cards, "EX7-064")?.pairPartnerIds).toEqual(["EX2-007"]);
  });

  it("omits pair partners from an entry that is not a banned pair", () => {
    const cards = resolveBanlistPolicy({ mode: "current" }, Date.parse("2025-06-01"));
    expect(statusOf(cards, "BT2-090")).toEqual({ cardId: "BT2-090", status: "banned", allowedCopies: 0 });
  });

  it("mirrors banlistAsOf exactly, card for card", () => {
    const createdAt = Date.parse("2025-06-01");
    const cards = resolveBanlistPolicy({ mode: "current" }, createdAt);
    expect(cards.map((card) => card.cardId)).toEqual(Object.keys(banlistAsOf("2025-06-01")).sort());
  });

  it("sorts the frozen list so two resolutions of the same policy are byte-identical", () => {
    const cards = resolveBanlistPolicy({ mode: "current" }, Date.parse("2025-06-01"));
    expect(cards.map((card) => card.cardId)).toEqual([...cards.map((card) => card.cardId)].sort());
  });

  it("accepts a lower-case or padded set id", () => {
    expect(banlistDateForSet(" bt7 ")).toBe(BT7_RELEASE);
  });

  it("normalizes a set id so two spellings freeze one identical policy", () => {
    expect(normalizeBanlistPolicy({ mode: "as_of_set", setId: " bt7 " })).toEqual({
      mode: "as_of_set",
      setId: "BT7",
    });
    expect(normalizeBanlistPolicy({ mode: "current" })).toEqual({ mode: "current" });
  });

  it("throws for a set with no verified release date", () => {
    expect(() => resolveBanlistPolicy({ mode: "as_of_set", setId: "BT999" }, Date.now())).toThrow(
      UnknownBanlistSetError,
    );
    // Promos release per card rather than as one product, so `P` has no set date.
    expect(banlistDateForSet("P")).toBeUndefined();
  });

  it("dates a policy in UTC", () => {
    expect(banlistDateOf(Date.parse("2025-03-28T00:00:00Z"))).toBe("2025-03-28");
  });
});
