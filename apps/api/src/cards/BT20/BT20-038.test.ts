import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-038.js";
import "./index.js";

describe("BT20-038 Falcomon", () => {
  it("reduces qualifying ACCEL digivolution only from the battle area", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
          into: { nameOrTrait: [{ tokens: ["ACCEL"], match: "trait" }] },
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "Piercing", raw: "＜Piercing＞" },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Pinamon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["ACCEL"], cost: 0, isAlternate: true },
    ]);
  });

  it("reduces the ACCEL alternate evolution in battle but not in breeding", async () => {
    for (const zone of ["battleArea", "breeding"] as const) {
      const s = setupEngine({
        0: {
          ...(zone === "battleArea"
            ? { battleArea: [{ card: "BT20-038", as: "falcomon" }] }
            : { breeding: { card: "BT20-038", as: "falcomon" } }),
          hand: [{ card: "BT20-039", as: "diatrymon" }],
        },
      });
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("falcomon").permanentId,
          instanceId: s.inst("diatrymon").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("falcomon").topCard.cardId === "BT20-039");
      expect(s.state.memory).toBe(zone === "battleArea" ? 2 : 1);
    }
  });

  it("grants Piercing from the inherited source stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-039", dp: 5000, under: ["BT20-038"], as: "host" }] },
      1: {
        battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "target" }],
        security: ["BT20-001"],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);
  });
});
