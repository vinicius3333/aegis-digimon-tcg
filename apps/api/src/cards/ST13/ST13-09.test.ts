import { describe, expect, it } from "vitest";
import { setupEngine, settle, type PermanentSpec, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT9/BT9-047.js";
import "./ST13-09.js";

describe("ST13-09 Ludomon", () => {
  it("places itself under a red host and plays the revealed eligible card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-05", as: "host" }],
          hand: [{ card: "ST13-09", as: "ludomon" }],
          deck: ["ST13-02"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ludomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-02"));
    expect(s.perm("host").stack.some((card) => card.cardId === "ST13-09")).toBe(true);
  });

  it("may decline the placement cost and leave the revealed card in the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-05", as: "host" }],
          hand: [{ card: "ST13-09", as: "ludomon" }],
          deck: ["ST13-02"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ludomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST13-09"));

    expect(s.perm("host").stack.some((card) => card.cardId === "ST13-09")).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toContain("ST13-02");
  });

  it("adds an ineligible reveal to hand after paying the placement cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-05", as: "host" }],
          hand: [{ card: "ST13-09", as: "ludomon" }],
          deck: ["ST13-16"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ludomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "ST13-16"));

    expect(s.perm("host").stack.at(-1)?.cardId).toBe("ST13-09");
  });

  it("grants Blocker to its inherited host only on the opponent's turn while the condition holds", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST13-12", as: "blocker", under: ["ST13-09"] },
          { card: "ST13-05", as: "red-ally" },
        ],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("blocker"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blocker").isSuspended);

    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});

const eligibleLegendArms = "BT3-010";

async function playLudomonOverRedHost(options: SetupEngineOptions, extraBattleArea: PermanentSpec[] = []) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "ST13-05", as: "host" }, ...extraBattleArea],
        hand: [{ card: "ST13-09", as: "ludomon" }],
        deck: [eligibleLegendArms],
      },
    },
    { autoSelectCards: true, declineDigiXros: true, ...options },
  );
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ludomon").instanceId })).toEqual({
    ok: true,
  });
  await settle();
  expect(s.state.pendingDecision).toBeUndefined();
  const player = s.state.players[0]!;
  const battleTopCardIds = Array.from(player.battleArea, (permanent) => permanent.topCard.cardId);
  return {
    ludomonOnBattleArea: battleTopCardIds.includes("ST13-09"),
    ludomonUnderHost: s.perm("host").stack.at(0)?.cardId === "ST13-09",
    revealedPlayed: battleTopCardIds.includes(eligibleLegendArms),
    revealedInHand: Array.from(player.hand, (card) => card.cardId).includes(eligibleLegendArms),
    revealedInDeck: Array.from(player.deck, (card) => card.cardId).includes(eligibleLegendArms),
  };
}

describe("ST13-09 Ludomon — KB Q&A rulings", () => {
  it("may decline its [On Play] placement and stays in the battle area as a Digimon (Q783)", async () => {
    const declined = await playLudomonOverRedHost({ autoDeclineOptional: true });
    expect(declined).toMatchObject({
      ludomonOnBattleArea: true,
      ludomonUnderHost: false,
      revealedPlayed: false,
      revealedInHand: false,
      revealedInDeck: true,
    });

    const accepted = await playLudomonOverRedHost({ autoAcceptOptional: true });
    expect(accepted).toMatchObject({ ludomonOnBattleArea: false, ludomonUnderHost: true });
  });

  it("may choose not to play the revealed [Legend-Arms] card, which is added to hand instead (Q784)", async () => {
    const notPlayed = await playLudomonOverRedHost({ autoAcceptOptional: true, declinePrompts: ["Ludomon"] });
    expect(notPlayed).toMatchObject({
      ludomonUnderHost: true,
      revealedPlayed: false,
      revealedInHand: true,
      revealedInDeck: false,
    });

    const played = await playLudomonOverRedHost({ autoAcceptOptional: true });
    expect(played).toMatchObject({ ludomonUnderHost: true, revealedPlayed: true, revealedInHand: false });
  });

  it("adds the revealed [Legend-Arms] card to hand when [Pomumon] forbids playing it (Q785)", async () => {
    const withPomumon = await playLudomonOverRedHost({ autoAcceptOptional: true }, [{ card: "BT9-047" }]);
    expect(withPomumon).toMatchObject({
      ludomonUnderHost: true,
      revealedPlayed: false,
      revealedInHand: true,
      revealedInDeck: false,
    });

    const withoutPomumon = await playLudomonOverRedHost({ autoAcceptOptional: true });
    expect(withoutPomumon).toMatchObject({ revealedPlayed: true, revealedInHand: false });
  });
});
