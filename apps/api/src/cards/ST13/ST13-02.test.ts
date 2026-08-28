import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-02.js";

describe("ST13-02 Zubamon", () => {
  it("places itself under a Legend-Arms host and plays the revealed eligible card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-05", as: "host" }],
          hand: [{ card: "ST13-02", as: "zubamon" }],
          deck: ["ST13-07"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zubamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-07"));
    expect(s.perm("host").stack.some((card) => card.cardId === "ST13-02")).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("may decline the placement cost and leave the revealed card in the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-05", as: "host" }],
          hand: [{ card: "ST13-02", as: "zubamon" }],
          deck: ["ST13-07"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zubamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST13-02"));

    expect(s.perm("host").stack.some((card) => card.cardId === "ST13-02")).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toContain("ST13-07");
  });

  it("adds an ineligible revealed card to hand after paying the placement cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-05", as: "host" }],
          hand: [{ card: "ST13-02", as: "zubamon" }],
          deck: ["ST13-16"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zubamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "ST13-16"));

    expect(s.perm("host").stack.at(-1)?.cardId).toBe("ST13-02");
  });

  it("deletes only a 3000-DP Digimon with its inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST13-03", as: "attacker", under: ["ST13-02"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "eligible", dp: 3000 },
            { card: "BT1-009", as: "too-large", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("too-large").permanentId);
  });
});
