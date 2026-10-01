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
          battleArea: [{ card: "BT21-043", as: "ownHost", under: [{ card: "BT21-041", as: "costCard" }] }],
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

  it("publicly pays the On Play cost with a Three Musketeers trait source", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-054", as: "shotmon" }],
          battleArea: [
            { card: "EX4-073", as: "traitHost", under: [{ card: "BT6-065", as: "traitSource" }] },
            { card: "EX7-043", as: "controlHost", under: [{ card: "EX7-040", as: "textOnlySource" }] },
          ],
        },
        1: { battleArea: [{ card: "BT21-049", as: "opponent", under: ["BT21-048"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("traitSource").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shotmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").topCard.cardId === "BT21-048" && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("traitSource").instanceId);
    expect(s.perm("controlHost").stack.map((card) => card.cardId)).toContain("EX7-040");
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-048")).toBe(true);
  });

  it("does not pay the stack-trash cost or de-digivolve when the effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-054", as: "shotmon" },
            { card: "BT21-043", as: "ownHost", under: [{ card: "BT21-041", as: "costCard" }] },
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
          battleArea: [{ card: "BT1-019", as: "ownHost", under: ["BT1-009"] }],
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
    expect(s.perm("ownHost").stack.some((card) => card.cardId === "BT1-009")).toBe(true);
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
    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("shotmon").instanceId);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-043")).toBe(true);
  });

  it("publicly declines an offered eligible On Play cost and preserves both source and target", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT21-054", as: "shotmon" }],
        battleArea: [{ card: "BT21-043", as: "ownHost", under: [{ card: "BT21-041", as: "costCard" }] }],
      },
      1: { battleArea: [{ card: "BT21-049", as: "opponent", under: ["BT21-048"] }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shotmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("ownHost").stack.map((card) => card.instanceId)).toContain(s.inst("costCard").instanceId);
    expect(s.perm("opponent").topCard.cardId).toBe("BT21-049");
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

async function linkShotmonOnto(hostCardId: string, extraHand: string[] = []) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: hostCardId, as: "host" }],
        hand: [{ card: "BT21-054", as: "shotmon" }, ...extraHand.map((card, index) => ({ card, as: `hand${index}` }))],
        deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
    },
    { autoSelectCards: true, autoDeclineOptional: true },
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
  await settle(
    () =>
      s.perm("host").linked.some((card) => card.instanceId === s.inst("shotmon").instanceId) &&
      s.state.pendingDecision === undefined,
  );
  return s;
}

async function digivolveHost(
  s: Awaited<ReturnType<typeof linkShotmonOnto>>,
  handAlias: string,
  alternateIndex?: number,
) {
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst(handAlias).instanceId,
      ...(alternateIndex === undefined ? {} : { alternateRequirementIndex: alternateIndex }),
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.perm("host").topCard.instanceId === s.inst(handAlias).instanceId && s.state.pendingDecision === undefined,
  );
}

function shotmonIsTrashed(s: Awaited<ReturnType<typeof linkShotmonOnto>>) {
  return s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("shotmon").instanceId);
}

describe("BT21-054 Shotmon — KB Q&A rulings", () => {
  it("counts a card with [Three Musketeers] only in its effect text for the Lv.2 digivolve requirement (Q4557)", async () => {
    for (const [base, allowed] of [
      ["BT25-005", true],
      ["EX7-005", true],
      // All three are black Lv.2 eggs, so only the [Three Musketeers] text separates them.
      ["BT13-005", false],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT21-054", as: "shotmon" }] },
      });
      s.state.memory = 1;
      await s.ready();

      const result = s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shotmon").instanceId,
        alternateRequirementIndex: 0,
      });

      await settle(() => !allowed || s.perm("base").topCard.instanceId === s.inst("shotmon").instanceId);

      expect({ base, ok: result.ok }).toEqual({ base, ok: allowed });
      expect(s.perm("base").topCard.cardId).toBe(allowed ? "BT21-054" : base);
      expect(s.state.memory).toBe(1);
    }
  });

  it("trashes the linked Shotmon at rule check when its host digivolves into non-Appmon Tankmon (Q4558)", async () => {
    const s = await linkShotmonOnto("BT21-053", ["EX7-043"]);
    expect(shotmonIsTrashed(s)).toBe(false);

    await digivolveHost(s, "hand0");
    await settle(() => shotmonIsTrashed(s));

    expect(s.perm("host").topCard.cardId).toBe("EX7-043");
    expect(s.perm("host").linked).toHaveLength(0);
    expect(shotmonIsTrashed(s)).toBe(true);
  });

  it("trashes the linked Shotmon at rule check when its host digivolves into non-Appmon Gigadramon (Q4578)", async () => {
    const s = await linkShotmonOnto("BT21-071", ["EX7-044"]);
    expect(shotmonIsTrashed(s)).toBe(false);

    await digivolveHost(s, "hand0", 0);
    await settle(() => shotmonIsTrashed(s));

    expect(s.perm("host").topCard.cardId).toBe("EX7-044");
    expect(s.perm("host").linked).toHaveLength(0);
    expect(shotmonIsTrashed(s)).toBe(true);
  });

  it("keeps Shotmon linked through an Appmon digivolve but trashes it once the host becomes Gundramon (Q4585)", async () => {
    const s = await linkShotmonOnto("BT21-071", ["BT21-074", "EX7-048"]);

    await digivolveHost(s, "hand0");
    expect(s.perm("host").topCard.cardId).toBe("BT21-074");
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("shotmon").instanceId]);

    await digivolveHost(s, "hand1");
    await settle(() => shotmonIsTrashed(s));

    expect(s.perm("host").topCard.cardId).toBe("EX7-048");
    expect(s.perm("host").linked).toHaveLength(0);
    expect(shotmonIsTrashed(s)).toBe(true);
  });
});
