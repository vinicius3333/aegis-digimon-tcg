import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
