import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-047.js";
import { playTakingMinimum } from "./minimumChoice.testSupport.js";

describe("EX6-047 Boogiemon", () => {
  it("reveals three for Fallen Angel/Demon Lord and purple Options, then trashes a hand card if it added", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          { count: 1, to: "hand" },
          { count: 1, to: "hand" },
        ],
        rest: "deckBottom",
      },
      { kind: "Trash", condition: { kind: "ifThisEffectActed" } },
    ]));
  it("inherits +1000 DP while the opponent has six or fewer cards", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        { kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "zoneCount", op: "lte", value: 6 } },
      ],
    }));

  it("publicly reveals three cards, adds the eligible Digimon and Option, then trashes one hand card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX6-047", as: "boogie" }],
          deck: ["EX6-059", "EX6-069", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("boogie").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("boogie").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("boogie").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.length).toBe(1);
    expect(s.state.players[0]!.trash.length).toBe(1);
  });
  it("applies the inherited +1000 DP only through the six-card opponent-hand boundary", async () => {
    const active = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "boogie", under: ["EX6-047"] }] },
      1: { hand: Array.from({ length: 6 }, () => "BT1-010") },
    });
    await active.ready();
    expect(active.perm("boogie").currentDP).toBe(4000);
    const inactive = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "boogie", under: ["EX6-047"] }] },
      1: { hand: Array.from({ length: 7 }, () => "BT1-010") },
    });
    await inactive.ready();
    expect(inactive.perm("boogie").currentDP).toBe(3000);
  });
});

describe("EX6-047 Boogiemon — KB Q&A rulings", () => {
  async function boogiemonRevealing(deck: string[]) {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX6-047", as: "boogiemon" },
          { card: "BT1-011", as: "kept" },
        ],
        deck,
      },
    });
    s.state.memory = 10;
    await s.ready();
    await playTakingMinimum(s, "boogiemon");
    return s;
  }

  it("adds the single matching card when only one kind is revealed (Q3778)", async () => {
    const s = await boogiemonRevealing(["BT1-009", "BT10-107", "BT1-010"]);
    const player = s.state.players[0]!;
    expect([...player.hand, ...player.trash].map((card) => card.cardId)).toContain("BT10-107");
    expect(player.deck.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
  });

  it("must add both matching cards when both kinds are revealed (Q3779)", async () => {
    const s = await boogiemonRevealing(["EX1-058", "BT10-107", "BT1-009"]);
    const player = s.state.players[0]!;
    expect([...player.hand, ...player.trash].map((card) => card.cardId).sort()).toEqual(
      ["BT1-011", "BT10-107", "EX1-058"].sort(),
    );
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("trashes only one card from hand after adding two (Q3780)", async () => {
    const s = await boogiemonRevealing(["EX1-058", "BT10-107", "BT1-009"]);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });
});
