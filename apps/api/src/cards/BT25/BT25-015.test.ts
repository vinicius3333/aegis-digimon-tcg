import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
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

  it("runs the same 6000-DP deletion from a public alternate TS digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-013", as: "base" }],
        hand: [{ card: "BT25-015", as: "garudamon" }],
      },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 6000 }] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("garudamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("base").topCard?.cardId).toBe("BT25-015");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-010");
  });

  it("uses Raid to redirect a player attack to the opponent's highest unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-015", as: "attacker", dp: 7000 }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "lower", dp: 5000 },
            { card: "BT1-010", as: "highest", dp: 6000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("lower").permanentId);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-010");
    expect(s.perm("attacker").isSuspended).toBe(true);
  });

  it("replays Fortitude after a battle deletion when the Lv5 holder has a source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-015", as: "host", dp: 6000, suspended: true, under: ["BT25-013"] }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const oldPermanentId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-015"));
    const replayed = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT25-015");
    expect(replayed).toBeDefined();
    expect(replayed?.permanentId).not.toBe(oldPermanentId);
    expect(replayed?.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT25-013");
  });

  it("does not trash security when both battle Digimon are deleted at the same timing", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-020", as: "host", dp: 6000, suspended: true, under: ["BT25-015"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 6000 }], security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("trashes security once after two public battles from a legal Lv6 host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-013", as: "base" }],
          hand: [
            { card: "BT25-015", as: "source" },
            { card: "BT1-025", as: "lv6" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target1", dp: 7000, suspended: true },
            { card: "BT1-010", as: "target2", dp: 7000, suspended: true },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT25-015");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lv6").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT1-025");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT25-013", "BT25-015"]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target1").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).toContain(s.perm("target2").permanentId);

    await advance(s.engine).verb.unsuspend([s.perm("base").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target2").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
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
