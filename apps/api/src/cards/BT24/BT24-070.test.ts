import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_070 } from "./BT24-070.js";
import "../index.js";

describe("BT24-070 Growlmon", () => {
  it("plays a qualifying purple Tamer from trash under the hand-size gate", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(BT24_070.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["trash"],
        target: { filter: { kind: ["Tamer"], colors: ["Purple"], playCostLte: 4 } },
        condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
      });
    }
    expect(BT24_070.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { levels: [3] }, count: 1 },
    });
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "plays a cost-4 purple Tamer from trash at four cards in hand on %s",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT24-070", as: "growlmon" }],
            hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
            trash: [{ card: "BT12-096", as: "tamer" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("growlmon"));
      await settle(() =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
      );

      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("tamer").instanceId);
    },
  );

  it("does not play the Tamer with five cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-070", as: "growlmon" }],
          hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
          trash: [{ card: "BT12-096", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("growlmon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("tamer").instanceId);
  });

  it("inherited attack deletes only one opposing level 3 per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-071", as: "host", under: ["BT24-070"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstLevel3" },
            { card: "BT1-010", as: "secondLevel3" },
            { card: "BT1-014", as: "level4" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(
      expect.arrayContaining([s.perm("secondLevel3").permanentId, s.perm("level4").permanentId]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("firstLevel3").instanceId);
  });
});
