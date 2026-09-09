import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-024.js";
import "../index.js";

describe("EX5-024 Azulongmon", () => {
  it("matches the catalog and encodes Blast Digivolve and every printed effect", () => {
    expect(getCardDefinition("EX5-024")).toMatchObject({
      cardId: "EX5-024",
      nameEn: "Azulongmon",
      colors: ["Blue", "Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 7,
      dp: 12000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Yellow", level: 5, memoryCost: 4 },
      ],
      types: ["Holy Dragon", "Four Great Dragons", "Four Sovereigns"],
      effectText: expect.stringContaining("Blast Digivolve"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        {
          trigger: "Counter",
          actions: [],
          isFromHand: true,
          keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
        },
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            {
              kind: "Return",
              to: "hand",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 5 },
                },
                count: 1,
              },
            },
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Deva", "Four Great Dragons", "Four Sovereigns"], match: "trait" }],
                },
                count: 1,
              },
            },
          ],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: expect.any(Array),
        }),
        {
          trigger: "OnDeletion",
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestLevel" },
                count: 1,
              },
            },
          ],
        },
      ]),
    );
  });

  it("returns only an opposing level-five-or-lower Digimon and unsuspends one matching own Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-021", as: "deva", suspended: true },
            { card: "BT1-080", as: "nonMatchingPeer", suspended: true },
          ],
          hand: [{ card: "EX5-024", as: "azulongmon" }],
        },
        1: {
          battleArea: [
            { card: "EX5-021", as: "levelFive" },
            { card: "BT1-080", as: "levelSix" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("azulongmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "EX5-021"));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["EX5-021"]);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT1-080"]);
    expect(s.perm("deva").isSuspended).toBe(false);
    expect(s.perm("nonMatchingPeer").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("returns an opposing level-five Digimon and unsuspends the destination on public digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-021", as: "base", suspended: true }],
          hand: [{ card: "EX5-024", as: "azulongmon" }],
        },
        1: {
          battleArea: [
            { card: "EX5-021", as: "levelFive" },
            { card: "BT1-080", as: "levelSix" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("azulongmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-024");

    expect(s.state.memory).toBe(6);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX5-021"]);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["EX5-021"]);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT1-080"]);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("deletes the highest-level opposing Digimon when it leaves by public battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-024", as: "azulongmon", suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 20000 },
            { card: "EX5-021", as: "levelFive" },
            { card: "BT1-080", as: "levelSix" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("azulongmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("azulongmon").permanentId),
    );

    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT1-009", "EX5-021"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects an illegal level-three evolution without charging memory or moving the card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "wrongLevel" }],
          hand: [{ card: "EX5-024", as: "azulongmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongLevel").permanentId,
        instanceId: s.inst("azulongmon").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(10);
    expect(s.perm("wrongLevel").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-024"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
