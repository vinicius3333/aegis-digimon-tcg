import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT17/BT17-084.js";
import "./index.js";
import { compiled } from "./BT20-011.js";

describe("BT20-011 ExVeemon", () => {
  it("deletes up to 3000 DP and optionally pays for qualifying DNA digivolution on both triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "DnaDigivolve",
        materials: { count: 2, filter: { controller: "mine", kind: ["Digimon"] } },
        into: {
          nameOrTrait: [
            { tokens: ["Imperialdramon"], match: "name" },
            { tokens: ["Free"], match: "trait" },
          ],
        },
        payCost: true,
        optional: true,
        condition: { kind: "isYourTurn" },
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("on play deletes only a 3000-DP target then performs the optional paid DNA evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST6-06", as: "purpleMaterial" }],
          hand: [
            { card: "BT20-011", as: "exVeemon" },
            { card: "BT20-016", as: "paildramon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 3000, as: "low" },
            { card: "BT20-012", dp: 4000, as: "high" },
          ],
          security: ["BT20-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("exVeemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-016"));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-011", "ST6-06"]),
    );
    expect(s.state.memory).toBe(-4); // play cost 4, then the selected Free card's cost 4
  });

  it("publicly triggers deletion and paid DNA on When Digivolving during its owner's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-007", dp: 3000, as: "opponentTarget" }] },
        1: {
          battleArea: [
            { card: "BT20-007", as: "redSource" },
            { card: "ST6-06", as: "secondMaterial" },
          ],
          hand: [
            { card: "BT20-011", as: "exVeemon" },
            { card: "BT20-016", as: "dnaCandidate" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const targetId = s.perm("opponentTarget").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("redSource").permanentId,
        instanceId: s.inst("exVeemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-016"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT20-016");
    expect(s.state.players[1]!.battleArea[0]!.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-007", "BT20-011", "ST6-06"]),
    );
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("dnaCandidate").instanceId);
    expect(s.state.memory).toBe(4); // evolution costs 2, then the selected DNA target costs 4
  });

  it("excludes its DNA branch on the opponent's turn through a public battle-deletion trigger", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-016", dp: 8000, suspended: true, as: "paildramon", under: ["ST6-06", "BT20-011"] },
            { card: "ST6-06", as: "purpleMaterial" },
            { card: "BT17-084", as: "davis" },
          ],
          hand: [{ card: "BT20-016", as: "dnaCandidate" }],
        },
        1: {
          battleArea: [
            { card: "BT20-012", dp: 10000, as: "attacker" },
            { card: "BT20-007", dp: 3000, as: "weakTarget" },
          ],
          security: ["BT20-001", "BT20-002"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferredInstanceIds,
      },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    const weakTargetId = s.perm("weakTarget").permanentId;
    preferredInstanceIds.push(s.perm("paildramon").stack.find((card) => card.cardId === "BT20-011")!.instanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("paildramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === weakTargetId) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-011"),
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === weakTargetId)).toBe(false);
    expect(s.perm("davis").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dnaCandidate").instanceId);
  });

  it("observably grants its inherited host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-016", dp: 8000, as: "host", under: ["BT20-011"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(10000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(8000);
  });

  it("can decline the optional DNA branch while still resolving the deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST6-06", as: "material" }],
          hand: [
            { card: "BT20-011", as: "exVeemon" },
            { card: "BT20-016", as: "dnaCandidate" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 3000, as: "low" },
            { card: "BT20-012", dp: 3001, as: "high" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("exVeemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-010"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-012")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dnaCandidate").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["ST6-06", "BT20-011"]);
    expect(s.state.memory).toBe(0);
  });
});
