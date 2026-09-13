import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

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
    // Only "Hiro Amanokawa" is found among the revealed cards — neither BT1-009 nor
    // BT1-014 has "Gammamon" in its text — so that slot's add fails and both unmatched
    // cards return to the deck bottom instead of leaving it.
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
