import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-083.js";

describe("BT5-083 Megidramon", () => {
  it.each([
    { base: "BT10-080", label: "purple" },
    { base: "BT1-020", label: "red" },
  ])("resolves the both-decks effect through a legal $label level 5 evolution", async ({ base }) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: base, as: "base" }],
        hand: [{ card: "BT5-083", as: "megidramon" }],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
      },
      1: { deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("megidramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-083");

    expect(s.perm("base").topCard.cardId).toBe("BT5-083");
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(0);
  });

  it("trashes up to five cards from both decks when digivolving", async () => {
    const ownDeck = [
      { card: "BT1-010", as: "ownTop1" },
      { card: "BT1-011", as: "ownTop2" },
      { card: "BT1-012", as: "ownTop3" },
      { card: "BT1-013", as: "ownTop4" },
      { card: "BT1-014", as: "ownTop5" },
      { card: "BT1-015", as: "ownSixth" },
    ];
    const opponentDeck = [
      { card: "BT1-020", as: "opponentTop1" },
      { card: "BT1-021", as: "opponentTop2" },
      { card: "BT1-022", as: "opponentTop3" },
      { card: "BT1-023", as: "opponentTop4" },
      { card: "BT1-024", as: "opponentTop5" },
      { card: "BT1-025", as: "opponentSixth" },
    ];
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-083", as: "megidramon" }], deck: ownDeck },
      1: { deck: opponentDeck },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("megidramon"));

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("ownSixth").instanceId]);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("opponentSixth").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("ownTop1").instanceId,
      s.inst("ownTop2").instanceId,
      s.inst("ownTop3").instanceId,
      s.inst("ownTop4").instanceId,
      s.inst("ownTop5").instanceId,
    ]);
    expect(s.state.players[1]!.trash).toHaveLength(5);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("opponentTop1").instanceId,
      s.inst("opponentTop2").instanceId,
      s.inst("opponentTop3").instanceId,
      s.inst("opponentTop4").instanceId,
      s.inst("opponentTop5").instanceId,
    ]);
  });

  it("trashes all available cards when either deck has fewer than five", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-083", as: "megidramon" }], deck: ["BT1-010", "BT1-011"] },
      1: { deck: ["BT1-012"] },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("megidramon"));

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("may play a level 6 Gallantmon from trash on deletion when you have a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-083", as: "megidramon" }, "BT1-087"],
          trash: [{ card: "BT5-081", as: "gallantmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("gallantmon").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("gallantmon").instanceId)).toBe(
      true,
    );
  });

  it("plays a matching level 6 Gallantmon from hand and leaves non-matching cards untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-083", as: "megidramon" }, "BT1-087"],
          hand: [
            { card: "BT5-081", as: "gallantmon" },
            { card: "EX2-073", as: "wrongLevel" },
          ],
          trash: [{ card: "BT5-082", as: "wrongName" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("gallantmon").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("gallantmon").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("wrongLevel").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wrongName").instanceId)).toBe(true);
  });

  it("may decline the optional Gallantmon play while leaving the eligible card in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-083", as: "megidramon" }, "BT1-087"],
          trash: [{ card: "BT5-081", as: "gallantmon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId]);
    await settle();

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("gallantmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does not offer the Gallantmon play without a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-083", as: "megidramon" }],
          trash: [{ card: "BT5-081", as: "gallantmon" }],
        },
        1: { battleArea: [{ card: "BT1-087", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId]);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("gallantmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("opponentTamer").topCard.cardId).toBe("BT1-087");
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
