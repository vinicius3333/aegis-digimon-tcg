import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-012 Apemon", () => {
  it("trashes an SW card and draws two on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX12-012", as: "source" },
            { card: "EX12-006", as: "cost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("trashes an SW card and draws two when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "base" }],
          hand: [
            { card: "EX12-012", as: "source" },
            { card: "EX12-006", as: "cost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.perm("base").topCard?.cardId).toBe("EX12-012");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("does not draw or trash when no SW card is available", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-012", as: "source" }, "BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
  });

  it.each([
    { timing: "on play", startAsEvolution: false },
    { timing: "when digivolving", startAsEvolution: true },
  ])("may decline the SW cost $timing and draws nothing", async ({ startAsEvolution }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: startAsEvolution ? [{ card: "EX12-006", as: "base" }] : [],
          hand: [
            { card: "EX12-012", as: "source" },
            { card: "EX12-006", as: "cost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    const intent = startAsEvolution
      ? {
          type: "digivolve" as const,
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
        }
      : { type: "playCard" as const, instanceId: s.inst("source").instanceId };
    expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
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

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      startAsEvolution ? ["BT1-010"] : ["BT1-009", "BT1-010"],
    );
  });

  it("keeps Raid and gives only its host +2000 DP on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-012", as: "host", under: ["EX12-012"] },
          { card: "EX12-012", as: "other" },
        ],
      },
    });
    await s.ready();

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("host").permanentId, "Raid")).toBe(true);
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.perm("other").currentDP).toBe(4000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);

    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("encodes the optional SW hand cost in both windows and the alternate evolution", () => {
    const compiled = registeredCompiledCards.get("EX12-012")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Shambala"], cost: 2, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Draw",
            amount: 2,
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "trash",
              target: { filter: { zone: "hand", nameOrTrait: [{ match: "trait", tokens: ["SW"] }] }, count: 1 },
            },
          },
        ],
      });
    }
  });

  it("digivolves for 2 by the standard red route or the level-3 Shambala alternate", async () => {
    expect(digivolutionRequirementsFor("EX12-012")).toEqual([
      { level: 3, traits: ["Shambala"], cost: 2, isAlternate: true },
    ]);

    for (const [baseCardId, useAlternateCost] of [
      ["EX12-005", false],
      ["EX12-006", true],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-012", as: "apemon" }],
        },
      });
      s.state.memory = 2;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("apemon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-012");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects alternate evolution over an off-color level-3 card without Shambala", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "base" }],
        hand: [{ card: "EX12-012", as: "apemon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("apemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
