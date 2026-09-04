import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-068.js";

describe("EX8-068", () => {
  it("waives its color requirement with no face-up security cards and protects DS Digimon from battle deletion at 1 or more memory", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "noFaceUpSecurity" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Aura",
      effect: { kind: "restriction", restriction: "beDeletedInBattle" },
      while: { kind: "memoryAtLeast", value: 1 },
    });
  });
  it("takes the bottom security card to hand and places itself face-up at the bottom", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", toTop: false },
      { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true },
    ]);
  });
  it("plays an optional level 5 or lower DS Digimon from hand on security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: { filter: { levelComparison: { op: "lte", value: 5 } } },
        },
      ],
    }));
  it("plays the exact DS Digimon from hand when the security effect is revealed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
        1: { security: [{ card: "EX8-068", as: "securityCard" }], hand: [{ card: "EX8-058", as: "dsCard" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[1] as PlayerState;
    const instanceId = s.inst("dsCard").instanceId;
    const memoryBeforeSecurityEffect = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId));
    expect(player.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.memory).toBe(memoryBeforeSecurityEffect);
  });
  it("prevents battle deletion of an own DS Digimon while memory is at least 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-058", as: "ds", suspended: true }],
        security: [{ card: "EX8-068", as: "source", faceUp: true }],
      },
      1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
    });
    s.state.memory = 1;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ds").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("ds").permanentId));

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("ds").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-058")).toBe(false);
  });
  it("does not waive the color requirement while security contains a face-up card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "red" }],
        hand: [{ card: "EX8-068", as: "option" }],
        security: [{ card: "BT1-002", as: "faceUp", faceUp: true }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toMatchObject({
      ok: false,
    });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
  it("moves bottom security to hand and places the exact option face-up at the new bottom", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-030"],
        hand: [{ card: "EX8-068", as: "option" }],
        security: [
          { card: "BT1-001", as: "top" },
          { card: "BT1-002", as: "bottom" },
        ],
      },
    });
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    const topId = s.inst("top").instanceId;
    const bottomId = s.inst("bottom").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bottomId)).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([topId, optionId]);
    expect(s.state.players[0]!.security[1]!.faceUp).toBe(true);
  });

  it("places itself face-up even when security is empty (Q3954-Q3955)", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX8-068", as: "option" }] } });
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(optionId);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
  });
});
