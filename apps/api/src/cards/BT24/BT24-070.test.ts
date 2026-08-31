import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_070 } from "./BT24-070.js";
import "../index.js";

describe("BT24-070 Growlmon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-070")).toMatchObject({
      cardId: "BT24-070",
      nameEn: "Growlmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Dragon"],
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
    });
  });

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

  it.each(["play", "digivolve"] as const)(
    "public %s leaves four cards in hand and plays a cost-4 purple Tamer from trash",
    async (entry) => {
      const s = setupEngine(
        {
          0: {
            ...(entry === "digivolve" ? { battleArea: [{ card: "BT24-068", as: "base" }] } : {}),
            hand: [{ card: "BT24-070", as: "growlmon" }, "BT1-001", "BT1-002", "BT1-003", "BT1-004"],
            trash: [{ card: "BT12-096", as: "tamer" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 6;
      await s.ready();

      const result =
        entry === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("growlmon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("growlmon").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
      );

      expect(s.state.memory).toBe(entry === "play" ? 1 : 4);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("tamer").instanceId);
    },
  );

  it("does not play the Tamer with five cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-070", as: "growlmon" }, "BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
          trash: [{ card: "BT12-096", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("growlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-070"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("tamer").instanceId);
  });

  it("public attack uses the inherited effect to delete only a level-3 opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT24-070"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstLevel3" },
            { card: "BT1-010", as: "secondLevel3" },
            { card: "BT1-014", as: "level4" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstLevel3").instanceId));
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(
      expect.arrayContaining([s.perm("secondLevel3").permanentId, s.perm("level4").permanentId]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("firstLevel3").instanceId);
  });
});
