import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";

// Each header was checked against its official English card image. The remaining
// clauses (security count, color count, and alternative trait routes) are preserved.
const cases = [
  ["EX12-027", "BT13-023", 0, 2],
  ["EX12-027", "EX8-017", 1, 2],
  ["EX12-050", "BT10-044", 0, 2],
  ["EX12-050", "EX8-039", 1, 2],
  ["EX4-074", "AD1-016", 0, 4],
  ["EX5-015", "BT1-029", 0, 0],
  ["EX5-015", "BT11-006", 1, 0],
  ["EX7-058", "BT11-083", 0, 0],
  ["EX7-061", "BT3-091", 0, 1],
  ["EX8-009", "BT2-009", 0, 0],
  ["EX8-009", "BT2-001", 0, 0],
  ["EX8-012", "BT2-013", 0, 0],
  ["EX8-015", "AD1-003", 0, 1],
  ["EX8-031", "BT5-036", 0, 0],
  ["EX8-052", "BT10-025", 0, 0],
  ["EX8-063", "EX6-059", 0, 1],
  ["LM-021", "BT1-010", 0, 3],
  ["LM-022", "BT1-029", 0, 3],
  ["LM-023", "BT5-044", 0, 1],
  ["P-139", "BT1-035", 0, 0],
  ["P-144", "BT2-054", 0, 0],
  ["P-145", "BT2-075", 0, 0],
  ["ST22-06", "BT5-044", 0, 1],
  ["P-153", "BT18-042", 0, 2],
] as const;

const automatic = { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true };

function layout(target: string, base: string, securityCount = 0) {
  const isEgg = getCardDefinition(base)!.level === 2;
  const s = setupEngine(
    {
      0: {
        battleArea: isEgg ? [] : [{ card: base, as: "base" }],
        breeding: isEgg ? { card: base, as: "base" } : undefined,
        security: Array.from({ length: securityCount }, () => "BT1-009"),
        hand: [{ card: target, as: "target" }, "BT1-085", "BT1-085"],
        deck: Array.from({ length: 20 }, () => "BT1-085"),
      },
      1: { deck: Array.from({ length: 20 }, () => "BT1-085") },
    },
    automatic,
  );
  s.state.memory = 10;
  return s;
}

describe("#5289 removal lane exact-name digivolution sweep", () => {
  for (const [target, base, alternateRequirementIndex, cost] of cases) {
    it(`${target}: preserves the printed route from ${getCardDefinition(base)!.nameEn} at cost ${cost}`, async () => {
      const s = layout(target, base);
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          alternateRequirementIndex,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.perm("base").topCard.instanceId === s.inst("target").instanceId &&
          !s.state.pendingDecision &&
          s.engine.mainVerbContinuationsInFlight === 0,
      );
      expect(s.perm("base").topCard.instanceId).toBe(s.inst("target").instanceId);
      expect(s.state.memory).toBe(10 - cost);
    });
  }

  for (const target of [...new Set(cases.map(([id]) => id))].filter((id) => id !== "P-153")) {
    it(`${target}: rejects a longer self name through its exact base-name route`, async () => {
      const s = layout(target, target);
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          alternateRequirementIndex: 0,
        }),
      ).toMatchObject({ ok: false });
      expect(s.perm("base").topCard.instanceId).not.toBe(s.inst("target").instanceId);
      expect(s.state.memory).toBe(10);
      expect(s.state.pendingDecision).toBeUndefined();
    });
  }

  it("P-153: rejects an unrelated three-color level 7 through the named route", async () => {
    const s = layout("P-153", "AD1-025");
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("target").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(10);
  });
  for (const [target, base] of [
    ["LM-021", "BT1-010"],
    ["LM-022", "BT1-029"],
  ] as const) {
    it(`${target}: preserves the two-or-fewer-security condition on its exact route`, async () => {
      const s = layout(target, base, 3);
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          alternateRequirementIndex: 0,
        }),
      ).toMatchObject({ ok: false });
      expect(s.state.memory).toBe(10);
    });
  }
  it("P-153: an exact MagnaGarurumon still needs three colors", async () => {
    const s = layout("P-153", "BT7-029");
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("target").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(10);
  });
});
