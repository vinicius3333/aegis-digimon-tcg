import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { revealTamerAndTextCard } from "./revealTamer.testSupport.js";

describe("RB1-005 Gammamon", () => {
  it("adds Hiro from the revealed cards", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "RB1-005", as: "gammamon" }], deck: ["RB1-032", "BT1-009", "BT1-014"] } },
      { autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gammamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "RB1-032")).toBe(true);
  });

  it("fills both search slots and returns the exact remainder to the deck bottom", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      { 0: { hand: [{ card: "RB1-005", as: "gammamon" }], deck: ["RB1-005", "RB1-032", "BT1-009"] } },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const searchedGammamon = s.state.players[0]!.deck[0]!.instanceId;
    const neutral = s.state.players[0]!.deck[2]!.instanceId;
    preferred.push(searchedGammamon);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gammamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === searchedGammamon) &&
        s.state.players[0]!.hand.some((card) => card.cardId === "RB1-032"),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === searchedGammamon)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "RB1-032")).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(neutral);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("grants inherited DP only when the top card has Gammamon in its text", async () => {
    const positive = setupEngine({
      0: { battleArea: [{ card: "RB1-008", as: "host", under: [{ card: "RB1-005" }] }] },
    });
    await positive.ready();
    expect(positive.perm("host").currentDP).toBe(8000);

    const negative = setupEngine({
      0: { battleArea: [{ card: "RB1-024", as: "host", under: [{ card: "RB1-005" }] }] },
    });
    await negative.ready();
    expect(negative.perm("host").currentDP).toBe(8000);
  });
});

describe("RB1-005 Gammamon — KB Q&A rulings", () => {
  it("does not read its own [Gammamon] text while it is a digivolution card (Q4076)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-024", as: "host", under: [{ card: "RB1-005" }] }] },
    });
    await s.ready();

    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["RB1-005"]);
    expect(s.perm("host").currentDP).toBe(8000);
  });

  it("must add a [Gammamon]-text card, but may let [Hiro Amanokawa] fill that slot alone (Q4077)", async () => {
    const tamerOnly = await revealTamerAndTextCard("RB1-005", "RB1-032", "RB1-009", "tamer");
    expect(tamerOnly.textSlotMin).toBe(1);
    expect(tamerOnly.textSlotCandidates).toEqual(
      expect.arrayContaining([tamerOnly.tamerInstanceId, tamerOnly.textCardInstanceId]),
    );
    expect(tamerOnly.handIds).toEqual(["RB1-032"]);
    expect([...tamerOnly.deckIds].sort()).toEqual(["BT1-009", "RB1-009"]);

    const both = await revealTamerAndTextCard("RB1-005", "RB1-032", "RB1-009", "textCard");
    expect([...both.handIds].sort()).toEqual(["RB1-032", "RB1-009"].sort());
    expect(both.deckIds).toEqual(["BT1-009"]);
  });
});
