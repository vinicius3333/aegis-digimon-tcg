import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-010 Greymon", () => {
  it("returns one matching Digimon from trash on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-010", as: "source" }],
          trash: ["EX12-005", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX12-005"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX12-005");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("matches Greymon in a Digimon name independently of the VB and ME traits", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-010", as: "source" }],
          trash: ["BT1-015", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-015"));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("returns one matching Digimon from trash when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-005", as: "base" }],
          hand: [{ card: "EX12-010", as: "source" }],
          trash: ["EX12-008", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX12-008"));

    expect(s.perm("base").topCard?.cardId).toBe("EX12-010");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX12-008");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("does not move an unrelated trash card in either timing window", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-010", as: "source" }],
          trash: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("ignores Tamer, Option, and Digi-Egg trash cards even when they carry the VB or ME trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-010", as: "source" }],
          trash: ["EX12-066", "EX12-072", "EX12-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX12-066", "EX12-072", "EX12-001"]);
  });

  it("may decline the matching trash recovery", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-010", as: "source" }],
          trash: [{ card: "EX12-005", as: "target" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("provides Raid independently as a printed keyword and an inherited keyword", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-010", as: "printed" },
          { card: "BT1-010", as: "host", under: ["EX12-010"] },
          { card: "BT1-010", as: "control" },
        ],
      },
    });
    await s.ready();

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("printed").permanentId, "Raid")).toBe(true);
    expect(continuous.hasKeyword(s.perm("host").permanentId, "Raid")).toBe(true);
    expect(continuous.hasKeyword(s.perm("control").permanentId, "Raid")).toBe(false);
  });

  it("encodes both optional recovery windows and alternate evolution requirements", () => {
    const compiled = registeredCompiledCards.get("EX12-010")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, names: ["Agumon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["ME", "VB"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toHaveLength(2);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  { match: "name", tokens: ["Greymon"] },
                  { match: "trait", tokens: ["VB", "ME"] },
                ],
              },
              count: 1,
            },
            to: "hand",
            optional: true,
          },
        ],
      });
    }
  });

  it("uses both standard colors at cost 3 and each printed alternate at cost 2", async () => {
    expect(digivolutionRequirementsFor("EX12-010")).toEqual([
      { level: 3, names: ["Agumon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["ME", "VB"], cost: 2, isAlternate: true },
    ]);

    for (const [baseCardId, useAlternateCost, startingMemory, expectedMemory] of [
      ["EX12-005", false, 3, 0],
      ["BT11-036", false, 3, 0],
      ["BT12-059", true, 2, 0],
      ["EX12-021", true, 2, 0],
      ["EX12-038", true, 2, 0],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-010", as: "greymon" }],
        },
      });
      s.state.memory = startingMemory;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("greymon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-010");
      expect(s.state.memory, `evolution route from ${baseCardId}`).toBe(expectedMemory);
    }
  });

  it("rejects an off-color level-3 card without Agumon in name, ME, or VB", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "base" }],
        hand: [{ card: "EX12-010", as: "greymon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("greymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("cannot return a matching Digimon from the opponent's trash", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX12-010", as: "source" }] },
        1: { trash: ["EX12-005"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["EX12-005"]);
  });
});
