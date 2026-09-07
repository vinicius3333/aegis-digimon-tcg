import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_007 } from "./BT25-007.js";
import "../index.js";

describe("BT25-007 Gatchmon", () => {
  it("matches the catalog, alternate evolution, and Link requirements", () => {
    expect(getCardDefinition("BT25-007")).toMatchObject({
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      forms: ["Stnd.", "Appmon"],
      attributes: ["Social"],
      types: ["Search"],
      linkDp: 2000,
      linkRequirement: "[Link] [Appmon] trait: Cost 1",
    });
    expect(BT25_007.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(BT25_007.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    expect(BT25_007.coverage).toBe("full");
    expect(BT25_007.residual).toEqual([]);
  });

  it("encodes the On Play and linked deletion clauses", () => {
    const effect = BT25_007.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const revealAdd = effect?.actions?.[0] as { add?: unknown } | undefined;
    expect(revealAdd?.add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: {
          controllerDefault: "mine",
          nameOrTrait: [{ tokens: ["Social", "Tool", "Reboot", "Creation"], match: "trait" }],
        },
      }),
    ]);
    expect(BT25_007.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } }, count: 1 },
          },
        ],
      }),
    );
  });

  it("adds distinct Appmon and qualifying secondary-trait cards and bottoms the rest", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-007", as: "gatchmon" }],
          deck: [
            { card: "BT21-009", as: "appmon" },
            { card: "BT25-036", as: "tool" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("appmon").instanceId, s.inst("tool").instanceId);

    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatchmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-007"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("appmon").instanceId, s.inst("tool").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it.each([
    ["Social", "BT21-009"],
    ["Reboot", "BT25-060"],
    ["Creation", "AD1-005"],
  ] as const)("selects the %s secondary union branch after a distinct Appmon", async (_label, secondary) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-007", as: "gatchmon" }],
          deck: [
            { card: "BT21-047", as: "appmonOnly" },
            { card: secondary, as: "secondary" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatchmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-007"));

    const hand = s.state.players[0]!.hand.map((card) => card.instanceId);
    expect(hand).toContain(s.inst("appmonOnly").instanceId);
    expect(hand).toContain(s.inst("secondary").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("bottoms all revealed cards in order when neither requested trait matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-007", as: "gatchmon" }],
          deck: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatchmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-007"));
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
    ]);
  });

  it("links for 1 memory and deletes only an opponent Digimon at or below 3000 DP", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT25-007", as: "link" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atBoundary", dp: 3000 },
            { card: "BT1-013", as: "aboveBoundary", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("atBoundary").permanentId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard.cardId !== "BT1-009"));

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
    expect(s.perm("host").currentDP).toBe(4000);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-013"]);
  });

  it("refuses linking to a legal non-Appmon host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "invalidHost" }],
        hand: [{ card: "BT25-007", as: "link" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("invalidHost").permanentId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
  });

  it("digivolves from a level-2 Appmon for zero memory", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT21-005", as: "base" },
        hand: [{ card: "BT25-007", as: "gatchmon" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gatchmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("gatchmon").instanceId);
    expect(s.state.memory).toBe(2);
  });
});
