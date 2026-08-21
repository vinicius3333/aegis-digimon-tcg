import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-068.js";

describe("EX8-068", () => {
  it("waives its color requirement with no face-up security cards and protects DS Digimon from battle deletion at 1 or more memory", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHaveNone", filter: { faceUp: true } },
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
    expect(compiled.effects?.find((entry) => entry.trigger === "Security"))
      .toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { filter: { levelComparison: { op: "lte", value: 5 } } } }] }));
  it("plays the exact DS Digimon from hand when the security effect is revealed", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "attacker" }] }, 1: { security: [{ card: "EX8-068", as: "securityCard" }], hand: [{ card: "EX8-058", as: "dsCard" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[1] as PlayerState;
    const instanceId = s.inst("dsCard").instanceId;
    const memoryBeforeSecurityEffect = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId));
    expect(player.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.memory).toBe(memoryBeforeSecurityEffect);
  });
  it("prevents battle deletion of an own DS Digimon while memory is at least 1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-068", as: "source" }, { card: "EX8-058", as: "ds", suspended: true }] },
      1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
    });
    s.state.memory = 1;
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("ds").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("ds").permanentId));

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("ds").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-058")).toBe(false);
  });
});
