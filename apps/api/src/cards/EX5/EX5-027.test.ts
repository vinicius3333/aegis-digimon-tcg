import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-027.js";
import "../index.js";

describe("EX5-027 Liollmon", () => {
  it("matches the catalog and encodes security search, Recovery, deletion DP, and Frimon evolution", () => {
    expect(getCardDefinition("EX5-027")).toMatchObject({
      cardId: "EX5-027",
      nameEn: "Liollmon",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Holy Beast"],
      evoCosts: [
        { color: "Yellow", level: 2, memoryCost: 1 },
        { color: "Green", level: 2, memoryCost: 1 },
      ],
      effectText: expect.stringContaining("Search your security stack"),
      inheritedEffectText: expect.stringContaining("gets -2000 DP until the end of their turn"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Frimon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([
      {
        kind: "Search",
        controller: "mine",
        searchZone: "security",
        filter: { controller: "mine", nameOrTrait: [{ tokens: ["Leomon"], match: "name" }] },
        count: 1,
        to: "hand",
        optional: true,
      },
      {
        kind: "SecurityManipulation",
        op: "addTop",
        controller: "mine",
        source: "deck",
        amount: 1,
        condition: { kind: "ifThisEffectActed" },
      },
      { kind: "SecurityManipulation", op: "shuffle", controller: "mine" },
    ]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toEqual({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -2000,
          duration: "untilOpponentTurnEnd",
        },
      ],
      isInherited: true,
    });
  });

  it("answers Q3591: reveals and adds a Leomon from security, recovers the deck top, then shuffles", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-027", as: "liollmon" }],
          security: ["BT1-035", "BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-035"));

    const added = s.state.players[0]!.hand.find((card) => card.cardId === "BT1-035");
    expect(added).toBeDefined();
    expect(added?.faceUp).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-010", "BT1-009"]),
    );
    expect(s.state.players[0]!.security.every((card) => card.faceUp !== true)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not Recover when security has no Leomon-name card and still shuffles the unchanged stack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-027", as: "liollmon" }],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.security.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-010"].sort());
    expect(s.state.players[0]!.security.every((card) => card.faceUp !== true)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-001"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-001");
    expect(s.events.some((event) => event.kind === "cardRevealed" && event.sourceCardId === "EX5-027")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps security and deck unchanged when the optional Leomon search is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-027", as: "liollmon" }],
          security: ["BT1-035", "BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.security.map((card) => card.cardId).sort()).toEqual(["BT1-035", "BT1-009"].sort());
    expect(s.state.players[0]!.security.every((card) => card.faceUp !== true)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-035");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("applies inherited -2000 DP through a public opposing attack and deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-027"], suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "attacker", dp: 10000 },
            { card: "BT1-011", as: "opponent", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").topCard!.instanceId);
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.perm("opponent").currentDP === 3000);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("opponent").currentDP).toBe(3000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { base: "BT1-005", alternate: false, cost: 1, legal: true },
    { base: "EX5-004", alternate: true, cost: 0, legal: true },
    { base: "BT1-001", alternate: true, cost: 0, legal: false },
  ])("checks the normal and Frimon alternate evolution route from $base", async ({ base, alternate, cost, legal }) => {
    const s = setupEngine({
      0: {
        breeding: { card: base, as: "base" },
        hand: [{ card: "EX5-027", as: "evo" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: alternate,
      }).ok,
    ).toBe(legal);
    await settle();

    if (legal) {
      expect(s.perm("base").topCard?.cardId).toBe("EX5-027");
      expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([base]);
      expect(s.state.memory).toBe(5 - cost);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    } else {
      expect(s.perm("base").topCard?.cardId).toBe(base);
      expect(s.perm("base").stack).toHaveLength(0);
      expect(s.state.memory).toBe(5);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-027"]);
    }
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
