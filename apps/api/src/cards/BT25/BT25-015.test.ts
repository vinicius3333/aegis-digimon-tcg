import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_015 } from "./BT25-015.js";
import "../index.js";

describe("BT25-015 Garudamon", () => {
  it("deletes one opposing Digimon at 6000 DP or less on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_015.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } }, count: 1 },
      });
    }
  });

  it("limits inherited security trash to this Digimon deleting in battle", () => {
    const inherited = BT25_015.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ frequency: "OncePerTurn" });
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenDeletesInBattle",
      sourceFilter: { isSelfRef: true },
      fireCondition: { kind: "triggerSourceNotDeletedAtSameTiming" },
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
    });
  });

  it("deletes exactly one opposing Digimon at the 6000 DP boundary from a real play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-015", as: "garudamon" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "atBoundary", dp: 6000 },
            { card: "BT1-010", as: "aboveBoundary", dp: 6001 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("aboveBoundary").permanentId);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-010");
  });

  it("trashes security after the inherited host wins a battle and does not repeat this turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-015", as: "source", dp: 7000 }] },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", dp: 6000, suspended: true }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-001");
  });

  it("keeps the printed identity and Giant Bird/TS alternate evolution", () => {
    expect(getCardDefinition("BT25-015")).toMatchObject({
      colors: ["Red", "Green"],
      level: 5,
      playCost: 7,
      dp: 7000,
      types: ["Birdkin", "Iliad", "TS"],
    });
    expect(digivolutionRequirementsFor("BT25-015")).toEqual([
      { level: 4, traits: ["Giant Bird", "TS"], cost: 3, isAlternate: true },
    ]);
  });
});
