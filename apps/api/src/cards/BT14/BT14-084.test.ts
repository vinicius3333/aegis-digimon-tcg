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
          security: [{ card: "BT1-009", as: "topSecurity" }],
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

describe("BT14-084 T.K. Takaishi — KB Q&A rulings", () => {
  function playTkWithHand(hand: { card: string; as: string }[]) {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT14-084", as: "tk" }, ...hand],
          security: [{ card: "BT1-010", as: "topSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tk").instanceId })).toEqual({ ok: true });
    return s;
  }

  it("activates its [Your Turn] memory gain when its own [On Play] places a card at the bottom of security (Q2456)", async () => {
    const placed = playTkWithHand([{ card: "P-074", as: "yellowVaccine" }]);
    await settle(() => placed.state.pendingDecision === undefined && placed.perm("tk").isSuspended);
    expect(placed.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      placed.inst("yellowVaccine").instanceId,
    ]);
    expect(placed.perm("tk").isSuspended).toBe(true);
    expect(placed.state.memory).toBe(8);

    const nothingPlaced = playTkWithHand([{ card: "BT1-009", as: "redVaccine" }]);
    await settle(() => nothingPlaced.state.pendingDecision === undefined);
    expect(nothingPlaced.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-009")).toBe(true);
    expect(nothingPlaced.perm("tk").isSuspended).toBe(false);
    expect(nothingPlaced.state.memory).toBe(7);
  });

  it("returns the top security card to the hand without revealing it to the opponent (Q2457)", async () => {
    const s = playTkWithHand([{ card: "P-074", as: "yellowVaccine" }]);
    await settle(() => s.state.pendingDecision === undefined && s.perm("tk").isSuspended);
    const returnedId = s.inst("topSecurity").instanceId;
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(returnedId);

    const publicIdentitiesOfReturnedCard = s.events.flatMap((event) =>
      event.kind === "cardsMoved" && event.instanceIds.includes(returnedId) ? [event.cardIds] : [],
    );
    expect(publicIdentitiesOfReturnedCard).toEqual([undefined]);
    expect(s.events.some((event) => event.kind === "cardRevealed" && event.cardId === "BT1-010")).toBe(false);
    expect(s.decisions.some(({ seat }) => seat === 1)).toBe(false);
  });

  it("Discord 1555015560587247616 reveals the yellow [Vaccine] card placed from hand into security", async () => {
    const s = playTkWithHand([{ card: "P-074", as: "yellowVaccine" }]);
    await settle(() => s.state.pendingDecision === undefined && s.perm("tk").isSuspended);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("yellowVaccine").instanceId,
    ]);
    expect(s.events.filter((event) => event.kind === "cardRevealed")).toEqual([
      expect.objectContaining({ seat: 0, cardId: "P-074", sourceCardId: "BT14-084" }),
    ]);
  });
});
