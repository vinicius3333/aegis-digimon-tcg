import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-054.js";
import "../index.js";

describe("BT21-054 Shotmon", () => {
  it("preserves both alternate Digivolution requirements and the Appmon link requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, texts: ["Three Musketeers"], cost: 0, isAlternate: true },
      { traits: ["Appmon"], cost: 0, isAlternate: true, level: 2 },
    ]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
  });

  it("requires trashing an Appmon or Three Musketeers card from a digivolution stack", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    const action = effect?.actions[0];

    expect(action).toMatchObject({ kind: "DeDigivolve", amount: 1, optional: true, abortOnDecline: true });
    const typedAction = action as { target?: unknown; cost?: unknown } | undefined;
    expect(typedAction?.target).toEqual({ filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 });
    expect(typedAction?.cost).toMatchObject({
      kind: "trash",
      target: {
        filter: {
          controller: "mine",
          zone: "digivolutionCards",
          nameOrTrait: [
            { tokens: ["Appmon"], match: "trait" },
            { tokens: ["Three Musketeers"], match: "trait", orPrevious: true },
          ],
        },
        count: 1,
      },
    });
  });

  it("deletes one opposing play-cost-3-or-less Digimon when linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenLinking");
    expect(effect).toEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 3 }, count: 1 },
          },
        ],
      }),
    );
  });

  it("trashes a qualifying own stack card to de-digivolve an opponent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-054", as: "shotmon" }],
          battleArea: [{ card: "BT1-009", as: "ownHost", under: [{ card: "BT21-041", as: "costCard" }] }],
        },
        1: { battleArea: [{ card: "BT21-049", as: "opponent", under: ["BT21-048"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shotmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").topCard.cardId === "BT21-048");

    expect(s.perm("ownHost").stack.some((card) => card.instanceId === s.inst("costCard").instanceId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT21-049")).toBe(true);
  });

  it("does not pay the stack-trash cost or de-digivolve when the effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-054", as: "shotmon" },
            { card: "BT1-009", as: "ownHost", under: [{ card: "BT21-041", as: "costCard" }] },
          ],
        },
        1: { battleArea: [{ card: "BT21-049", as: "opponent", under: ["BT21-048"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shotmon"));

    expect(s.perm("ownHost").stack.some((card) => card.instanceId === s.inst("costCard").instanceId)).toBe(true);
    expect(s.perm("opponent").topCard.cardId).toBe("BT21-049");
  });

  it("publicly declines the On Play cost when no qualifying stack card exists", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-054", as: "shotmon" }],
          battleArea: [{ card: "BT1-009", as: "ownHost", under: ["BT1-001"] }],
        },
        1: { battleArea: [{ card: "BT21-049", as: "opponent", under: ["BT21-048"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shotmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-054"));
    expect(s.perm("opponent").topCard.cardId).toBe("BT21-049");
    expect(s.perm("ownHost").stack.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("refuses linking onto a non-Appmon host without spending memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host" }], hand: [{ card: "BT21-054", as: "shotmon" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("shotmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("shotmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("links for 1 and deletes only the play-cost-3 boundary target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-053", as: "host" }],
          hand: [{ card: "BT21-054", as: "shotmon" }],
        },
        1: {
          battleArea: [
            { card: "BT21-053", as: "cost3" },
            { card: "BT21-043", as: "cost4" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost3").topCard.instanceId);
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("shotmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("cost3").instanceId));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-043")).toBe(true);
  });

  it("trashes its link card at rule check after Tankmon makes the host ineligible", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-053", as: "host" }],
          hand: [
            { card: "BT21-054", as: "shotmon" },
            { card: "EX7-043", as: "tankmon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("shotmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("shotmon").instanceId));

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("tankmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("shotmon").instanceId));

    expect(s.perm("host").linked).toHaveLength(0);
  });

  it("zero-cost evolves through both the Three Musketeers-text and Appmon routes", async () => {
    for (const [base, requirementIndex] of [
      ["BT25-005", 0],
      ["BT21-005", 1],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT21-054", as: "shotmon" }],
        },
      });
      s.state.memory = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("shotmon").instanceId,
          alternateRequirementIndex: requirementIndex,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.instanceId === s.inst("shotmon").instanceId);
      expect(s.state.memory).toBe(1);
    }
  });
});
