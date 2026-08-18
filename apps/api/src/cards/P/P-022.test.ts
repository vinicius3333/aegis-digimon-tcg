import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-025.js";
import "./P-022.js";

describe("P-022 DNA Digivolution-Hearts United", () => {
  it("atomically bottoms exact ExVeemon and Stingmon in chosen order to play Paildramon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT3-093", "BT3-094"],
          hand: [
            { card: "P-022", as: "option" },
            { card: "BT3-025", as: "exVeemon" },
            { card: "BT3-050", as: "stingmon" },
            { card: "BT3-027", as: "paildramon" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: false },
    );
    const exId = s.inst("exVeemon").instanceId;
    const stingId = s.inst("stingmon").instanceId;
    const paildramonId = s.inst("paildramon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderCards"));
    const order = [...s.decisions].reverse().find(({ req }) => req.kind === "orderCards")!.req;
    expect(order.sourceCardId).toBe("P-022");
    expect(order.options?.timing).toBe("OnUseOption");
    expect(order.options?.effectText).toContain("[Main] If you have [Davis Motomiya]");
    expect(order.options?.orderDestination).toBe("deckBottom");
    expect(order.options?.visibleCards).toEqual(expect.arrayContaining([
      { instanceId: exId, cardId: "BT3-025" },
      { instanceId: stingId, cardId: "BT3-050" },
    ]));
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: order.decisionId,
      response: { kind: "orderCards", order: [stingId, exId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === paildramonId,
    ));

    expect(s.state.players[0]!.deck.slice(-2).map((card) => card.instanceId)).toEqual([stingId, exId]);
  });

  it("does not bottom either named card unless both parts of the cost are available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT3-093", "BT3-094"],
          hand: [
            { card: "P-022", as: "option" },
            { card: "BT3-025", as: "exVeemon" },
            { card: "BT3-027", as: "paildramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const exId = s.inst("exVeemon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === exId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT3-027")).toBe(false);
  });

  it("does not treat the combined Davis and Ken Tamer as both exact named Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT8-088"],
          hand: [
            { card: "P-022", as: "option" },
            { card: "BT3-025", as: "exVeemon" },
            { card: "BT3-050", as: "stingmon" },
            { card: "BT3-027", as: "paildramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const namedIds = [s.inst("exVeemon"), s.inst("stingmon"), s.inst("paildramon")]
      .map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(namedIds.every((instanceId) =>
      s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)
    )).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "P-022", as: "option" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    const optionId = s.inst("option").instanceId;
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, {
      type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.hand.some((card) => card.instanceId === optionId),
      5000,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("is suppressed when BT1 WarGreymon checks this Option from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "P-022", as: "option" }] },
      1: { battleArea: [{ card: "BT1-025", as: "warGreymon" }] },
    });
    const optionId = s.inst("option").instanceId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("warGreymon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    assertNoLoudGap(s);
  });
});
