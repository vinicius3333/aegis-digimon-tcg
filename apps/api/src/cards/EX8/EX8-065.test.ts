import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-065.js";

describe("EX8-065", () => {
  it("gains 1 memory at the start of the main phase when the opponent has a Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas" },
    }));
  it("may digivolve a Tyrannomon or Dinosaur attacker from hand by suspending this Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, optional: true, cost: { kind: "suspend" } }],
    });
  });
  it("plays itself without paying the cost when revealed in security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    }));
  it("plays the exact face-up security card into the battle area without cost", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "attacker" }] }, 1: { security: [{ card: "EX8-065", as: "securityCard" }] } });
    const instanceId = s.inst("securityCard").instanceId;
    const memoryBeforeSecurityEffect = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.memory).toBe(memoryBeforeSecurityEffect);
  });
  it("suspends this Tamer to digivolve a real Tyrannomon attacker from hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-016", as: "attacker" }, { card: "EX8-065", as: "tamer" }], hand: [{ card: "BT1-024", as: "tyrannomon" }] },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 0;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard?.cardId === "BT1-024");

    expect(s.perm("attacker").topCard?.cardId).toBe("BT1-024");
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-024")).toBe(false);
  });
});
