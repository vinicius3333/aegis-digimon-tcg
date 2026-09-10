import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-035.js";
import "../index.js";

describe("EX5-035 Hawkmon", () => {
  it("matches the catalog and encodes the non-OPT search and inherited DP aura", () => {
    expect(getCardDefinition("EX5-035")).toMatchObject({
      cardId: "EX5-035",
      nameEn: "Hawkmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      forms: ["Rookie"],
      attributes: ["Free"],
      types: ["Avian"],
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      effectText: expect.stringContaining("Reveal the top 3 cards of your deck"),
      inheritedEffectText: expect.stringContaining("gains +1000 DP"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.every((entry) => entry.frequency === undefined)).toBe(true);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([
      {
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          {
            filter: { controllerDefault: "mine", kind: ["Digimon"], keywords: ["Fortitude"] },
            count: "all",
            to: "hand",
          },
        ],
        rest: "deckBottom",
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toEqual({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: { kind: "selfIsSuspended", raw: "this Digimon is suspended" },
        },
      ],
      isInherited: true,
    });
  });

  it("publicly adds every revealed Fortitude Digimon and bottoms every other reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-035", as: "hawkmon" }],
          deck: ["EX5-032", "BT1-009", "EX5-032"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hawkmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.filter((card) => card.cardId === "EX5-032").length === 2);

    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "EX5-032")).toHaveLength(2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-009");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves a public On Play search unchanged when no revealed card has Fortitude", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-035", as: "hawkmon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hawkmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX5-035"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { base: "BT1-007", legal: true },
    { base: "BT1-005", legal: false },
  ])("checks the green level-2 evolution route from $base", async ({ base, legal }) => {
    const s = setupEngine({
      0: {
        breeding: { card: base, as: "base" },
        hand: [{ card: "EX5-035", as: "hawkmon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hawkmon").instanceId,
      }).ok,
    ).toBe(legal);
    await settle();

    expect(s.perm("base").topCard?.cardId).toBe(legal ? "EX5-035" : base);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(legal ? [base] : []);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(legal ? [] : ["EX5-035"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("applies the inherited +1000 DP only while a public host is suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-035"] }] },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Fortitude")).toBe(false);
    expect(s.perm("host").currentDP).toBe(6000);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await settle(() => s.perm("host").currentDP === 5000);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
