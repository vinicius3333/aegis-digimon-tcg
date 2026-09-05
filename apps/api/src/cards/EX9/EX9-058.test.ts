import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-058.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX9-058", () => {
  it.each([true, false])(
    "Q4822 adds a lone dual-trait card before placement, or bottoms an all-nonmatching reveal (match=%s)",
    async (match) => {
      const first = match ? "EX9-010" : "BT1-046";
      const s = setupEngine(
        { 0: { hand: [{ card: "EX9-058", as: "source" }], deck: [first, "BT1-010", "BT1-048", "BT1-009"] } },
        { autoSelectCards: true, autoOrderCards: true },
      );
      s.state.memory = 5;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(match ? [first] : []);
      expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
      expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(
        match ? ["BT1-009", "BT1-010", "BT1-048"] : ["BT1-009", first, "BT1-010", "BT1-048"],
      );
      expect(s.state.memory).toBe(2);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it.each([
    ["EX9-002", true, true],
    ["BT1-001", true, false],
    ["BT2-007", false, true],
  ] as const)("validates the egg evolution route from %s (alternate=%s, legal=%s)", async (base, alternate, legal) => {
    const s = setupEngine({
      0: { breeding: { card: base, as: "base" }, hand: [{ card: "EX9-058", as: "evo" }], deck: ["BT1-046"] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: alternate,
      }).ok,
    ).toBe(legal);
    await settle();
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe(legal ? "EX9-058" : base);
    expect(s.state.players[0]!.breeding?.stack.map(({ cardId }) => cardId)).toEqual(legal ? [base] : []);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(legal ? ["BT1-046"] : ["EX9-058"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("reveals three and adds a DM card and places a Ver.5 card under a DM Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [{ to: "hand" }, { to: "placeUnder" }],
    }));
  it("adds the DM card before choosing a remaining Ver.5 card and a DM host", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      add: [
        {
          count: 1,
          to: "hand",
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["DM"], match: "trait" }] },
        },
        {
          count: 1,
          to: "placeUnder",
          faceDown: true,
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Ver.5"], match: "trait" }] },
          underFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["DM"], match: "trait" }],
          },
        },
      ],
    }));
  it("inherits Retaliation", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Retaliation",
      raw: "＜Retaliation＞",
    }));
  it("adds a DM reveal, places the Ver.5 reveal face-down under a DM host, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-064", as: "nonDM" },
            { card: "EX9-050", as: "host", under: ["EX9-046"] },
          ],
          hand: [{ card: "EX9-058", as: "source" }],
          deck: ["EX9-049", "EX9-010", "BT1-009", "BT1-048"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-049")).toBe(true);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-010", "EX9-046"]);
    expect(s.perm("host").stack[0]).toMatchObject({ cardId: "EX9-010", faceUp: false });
    expect(s.perm("nonDM").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048", "BT1-009"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("grants Retaliation to a legal host through the inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-073", as: "host", under: ["EX9-058"], suspended: true }], security: ["BT1-010"] },
      1: { battleArea: [{ card: "BT10-064", as: "attacker" }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT2-073", "EX9-058"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT10-064"]);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
