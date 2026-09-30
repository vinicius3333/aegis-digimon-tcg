import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";
import { revealTamerAndTextCard } from "./revealTamer.testSupport.js";

describe("RB1-020 Angoramon", () => {
  it("reveals three cards and adds the Angoramon-text card plus Ruli", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "RB1-020", as: "angoramon" }],
          deck: ["RB1-034", "RB1-022", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angoramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "RB1-034")).toHaveLength(1);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "RB1-022")).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["RB1-022", "BT1-009"]);
  });

  it("adds no cards when the revealed cards have no matching text or Ruli name", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "RB1-020", as: "angoramon" }], deck: ["BT1-009", "BT1-014", "BT1-015"] },
    });

    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angoramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("gains inherited DP only while the opponent has no unsuspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-020", as: "angoramon", under: [{ card: "RB1-020" }] }] },
      1: { battleArea: [{ card: "RB1-024", as: "opponent" }] },
    });
    await s.ready();

    expect(s.perm("angoramon").currentDP).toBe(1000);
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.perm("angoramon").currentDP).toBe(2000);
  });

  it("treats an empty opponent battle area as having no unsuspended Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "RB1-021", as: "host", under: [{ card: "RB1-020" }] }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(7000);
  });
});

describe("RB1-020 Angoramon — KB Q&A rulings", () => {
  it("must add a [Angoramon]-text card, but may let [Ruli Tsukiyono] fill that slot alone (Q4096)", async () => {
    const tamerOnly = await revealTamerAndTextCard("RB1-020", "RB1-034", "RB1-022", "tamer");
    expect(tamerOnly.textSlotMin).toBe(1);
    expect(tamerOnly.textSlotCandidates).toEqual(
      expect.arrayContaining([tamerOnly.tamerInstanceId, tamerOnly.textCardInstanceId]),
    );
    expect(tamerOnly.handIds).toEqual(["RB1-034"]);
    expect([...tamerOnly.deckIds].sort()).toEqual(["BT1-009", "RB1-022"]);

    const both = await revealTamerAndTextCard("RB1-020", "RB1-034", "RB1-022", "textCard");
    expect([...both.handIds].sort()).toEqual(["RB1-034", "RB1-022"].sort());
    expect(both.deckIds).toEqual(["BT1-009"]);
  });

  it("counts an opponent with no Digimon at all as having no unsuspended Digimon (Q6048)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-021", as: "host", under: [{ card: "RB1-020" }] }] },
      1: { battleArea: [{ card: "RB1-032", as: "opponentTamer" }] },
    });
    await s.ready();

    expect(s.state.players[1]!.battleArea.every((permanent) => permanent.topCard?.cardId === "RB1-032")).toBe(true);
    expect(s.perm("host").currentDP).toBe(6000 + 1000);
  });
});
