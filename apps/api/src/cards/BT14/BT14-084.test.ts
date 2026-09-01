import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-084.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-084", () => {
  it("may return the top security card to place a yellow Vaccine card from hand as security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      from: ["hand"],
      cost: { kind: "securityToHand" },
      source: { filter: { colors: ["Yellow"], nameOrTrait: [{ tokens: ["Vaccine"], match: "trait" }] } },
    }));
  it("plays itself from security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    }));

  it("naturally replaces the top security card and separately suspends to gain memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT14-084", as: "tk" },
            { card: "P-074", as: "vaccine" },
          ],
          security: [{ card: "BT1-001", as: "topSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tk").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tk").isSuspended && s.state.players[0]!.security.length === 1);
    expect(s.perm("tk").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("topSecurity").instanceId)).toBe(true);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(s.inst("vaccine").instanceId);
    expect(s.state.memory).toBe(8);
  });

  it("naturally plays itself without cost when revealed in security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-071", as: "attacker" }] },
        1: { security: [{ card: "BT14-084", as: "securityTk" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT14-084"));

    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT14-084")).toBe(true);
  });
});
