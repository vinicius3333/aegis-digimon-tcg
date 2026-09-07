import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-040.js";
import "../index.js";

/**
 * BT21-040's alternate digivolution is gated on EITHER printed alternative:
 * "your opponent has a level 6 or higher Digimon OR you have 3 or more [Hero] trait Tamers
 * with different names". Each branch is proven to open the path on its own, and a board that
 * satisfies neither is proven to keep it shut.
 */
const SHINEGREYMON = "BT13-018";
const SHINEGREYMON_BURST_MODE = "BT13-020";
const OPPONENT_LV6 = "AD1-004"; // WarGreymon, level 6
const HERO_TAMERS = ["BT21-080", "BT21-082", "BT21-083"]; // three distinct [Hero] Tamer names
const EFFECT_KEY = `BT21-040/ir-${EffectTiming.OnDeclaration}-0`;

function board(opts: { opponentLv6?: boolean; heroTamers?: number }) {
  const tamers = HERO_TAMERS.slice(0, opts.heroTamers ?? 0).map((card) => ({ card }));
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT21-040", as: "agumon" }, ...tamers],
        hand: [{ card: SHINEGREYMON, as: "shine" }],
      },
      1: { battleArea: opts.opponentLv6 ? [{ card: OPPONENT_LV6 }] : [] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  return s;
}

async function digivolvesForFour(s: ReturnType<typeof board>): Promise<boolean> {
  await s.ready();
  const before = s.state.memory;
  const result = s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm("agumon").topCard.instanceId,
    effectKey: EFFECT_KEY,
  });
  if (!result.ok) return false;
  await settle(() => s.perm("agumon").topCard?.cardId === SHINEGREYMON, 2000);
  // The alternate path is the only one that reaches ShineGreymon from a level 3 for 4 memory.
  expect(before - s.state.memory).toBe(4);
  return s.perm("agumon").topCard?.cardId === SHINEGREYMON;
}

describe("BT21-040 Agumon", () => {
  it("uses an exact Digimon name matcher for the standalone [ShineGreymon] reference", () => {
    const effect = compiled.effects.find((candidate) => !candidate.isInherited && candidate.trigger === "YourTurn");
    expect(effect).toEqual(
      expect.objectContaining({
        actions: [
          expect.objectContaining({
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["ShineGreymon"], match: "nameExact" }],
            },
          }),
        ],
      }),
    );
  });

  it("preserves the two zero-cost alternate Digivolution requirements", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Koromon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["Hero"], cost: 0, isAlternate: true },
    ]);
  });

  it("preserves the inherited +2000 DP effect for your turn", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited);
    expect(inherited).toEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            amount: 2000,
            duration: "permanent",
          },
        ],
      }),
    );
  });

  it("opens the ShineGreymon path when the opponent has a level 6 Digimon", async () => {
    expect(await digivolvesForFour(board({ opponentLv6: true }))).toBe(true);
  });

  it("evolves into an exact dual ST24-07 while it is still in hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-040", as: "agumon" }], hand: [{ card: "ST24-07", as: "shine" }] },
        1: { battleArea: [{ card: OPPONENT_LV6 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("agumon").topCard.instanceId,
        effectKey: EFFECT_KEY,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.cardId === "ST24-07", 5000);
    expect(s.perm("agumon").topCard.cardId).toBe("ST24-07");
    expect(s.state.memory).toBe(6);
  });

  it("opens it on three distinct [Hero] Tamers alone, with no level 6 opposite", async () => {
    expect(await digivolvesForFour(board({ heroTamers: 3 }))).toBe(true);
  });

  it("keeps the optional ShineGreymon evolution closed during the opponent's turn", async () => {
    const s = board({ opponentLv6: true });
    s.state.turnSeat = 1;
    await s.ready();
    const handId = s.inst("shine").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("agumon").topCard.instanceId,
        effectKey: EFFECT_KEY,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === handId)).toBe(true);
    expect(s.state.memory).toBe(10);
  });

  it("keeps it shut when neither alternative holds", async () => {
    // FAILS-WHEN-REVERTED: flattening both alternatives into one filter made this board — two
    // Hero Tamers and no level 6 opposite — indistinguishable from the ones above.
    const s = board({ heroTamers: 2 });
    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("agumon").topCard.instanceId,
      effectKey: EFFECT_KEY,
    });
    expect(result).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("does not treat a near-name ShineGreymon card as the standalone target", () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-040", as: "agumon" }],
          hand: [{ card: SHINEGREYMON_BURST_MODE, as: "burst" }],
        },
        1: { battleArea: [{ card: OPPONENT_LV6 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("agumon").topCard.instanceId,
        effectKey: EFFECT_KEY,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("requires three distinct Hero Tamer names rather than three copies", () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-040", as: "agumon" },
            { card: "BT21-080" },
            { card: "BT21-080" },
            { card: "BT21-080" },
          ],
          hand: [{ card: SHINEGREYMON, as: "shine" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("agumon").topCard.instanceId,
        effectKey: EFFECT_KEY,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("may decline the qualified ShineGreymon evolution without paying memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-040", as: "agumon" }],
          hand: [{ card: SHINEGREYMON, as: "shine" }],
        },
        1: { battleArea: [{ card: OPPONENT_LV6 }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("agumon").topCard.instanceId,
        effectKey: EFFECT_KEY,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("agumon").topCard.cardId).toBe("BT21-040");
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("shine").instanceId);
  });

  it("Q5211: a qualified BT21-040 can evolve from Agumon through an aged P-105 Delay for 4-2", async () => {
    // RED regression: Q5211 permits this Your Turn alternate evolution to be activated at
    // the same time as P-105's Delay. The Delay must retain BT21-040's qualified
    // ignore-requirements permission while applying its own -2 reduction. This intentionally
    // expects the public result; do not weaken it to a failed legality preflight.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-040", as: "agumon" },
            { card: "P-105", as: "training" },
          ],
          hand: [{ card: "BT13-018", as: "shine" }],
        },
        1: { battleArea: [{ card: OPPONENT_LV6 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnCount = 1; // P-105 entered on an earlier turn, so Delay is aged and usable.
    await s.ready();
    const delayEffect = JSON.parse(s.perm("training").activatableEffectsJson) as { effectKey: string }[];
    expect(delayEffect).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("training").instanceId,
        effectKey: delayEffect[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.cardId === "BT13-018");
    expect(s.perm("agumon").topCard.cardId).toBe("BT13-018");
    expect(s.state.memory).toBe(8);
  });

  it.each([
    { base: "BT21-004", route: "Koromon" },
    { base: "BT21-002", route: "level-2 Hero" },
  ])("evolves from $route for 0", async ({ base }) => {
    const s = setupEngine({
      0: {
        breeding: { card: base, as: "base" },
        hand: [{ card: "BT21-040", as: "agumon" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("agumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-040");

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([base]);
  });

  it("grants inherited +2000 DP only during its controller's turn", async () => {
    for (const turnSeat of [0, 1] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT21-016", as: "host", under: ["BT21-040"] }] },
      });
      s.state.turnSeat = turnSeat;
      await s.ready();

      expect(s.perm("host").currentDP).toBe(turnSeat === 0 ? 7000 : 5000);
    }
  });

  it("does not treat a used dual ShineGreymon Option as an available hand evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-040", as: "agumon" },
            { card: "ST24-04", as: "dataSquadSource" },
          ],
          hand: [{ card: "ST24-07", as: "dualShine" }],
        },
        1: { battleArea: [{ card: "AD1-004", as: "opponentLv6" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dualShine").instanceId,
        useAs: "option",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("dualShine").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("dualShine").instanceId)).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("agumon").topCard.instanceId,
        effectKey: EFFECT_KEY,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("agumon").topCard.cardId).toBe("BT21-040");
  });

  it("Q6246: a real Arts window excludes the used ST24-07 from BT21-040's hand evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-040", as: "agumon" },
            { card: "ST24-06", as: "legalArtsHost" },
          ],
          hand: [{ card: "ST24-07", as: "dualShine" }],
        },
        1: {
          // ST24-07's Option effect deletes the 6000-DP target after its -6000 modifier;
          // retain a second printed Lv6 so BT21-040's Your Turn gate is still qualified at
          // the actual Arts window.
          battleArea: [
            { card: "BT1-080", as: "opponentTarget" },
            { card: OPPONENT_LV6, as: "opponentLv6" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dualShine").instanceId,
        useAs: "option",
      }),
    ).toEqual({ ok: true });

    // The Option effect resolves before the Arts replacement prompt. The legal Lv5 host is
    // offered; the audited Lv3 Agumon is absent even though its Your Turn condition qualifies.
    let artsDecisionId: string | undefined;
    for (let step = 0; step < 4; step += 1) {
      await settle(() => s.state.pendingDecision !== undefined, 5000);
      const pending = s.state.pendingDecision;
      if (pending === undefined) throw new Error("expected Option/Arts decision");
      const payload = JSON.parse(pending.payloadJson) as { candidateInstanceIds?: string[] };
      if (pending.kind === "selectCards") {
        artsDecisionId = pending.decisionId;
        expect(payload.candidateInstanceIds).toContain(s.perm("legalArtsHost").topCard.instanceId);
        expect(payload.candidateInstanceIds).not.toContain(s.perm("agumon").topCard.instanceId);
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: pending.decisionId,
            response: { kind: "selectCards", instanceIds: [] },
          }),
        ).toEqual({ ok: true });
        break;
      }
      expect(pending.kind).toBe("chooseTargets");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "chooseTargets", instanceIds: [s.perm("opponentTarget").permanentId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== pending.decisionId);
    }
    expect(artsDecisionId).toBeDefined();
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("dualShine").instanceId));
    expect(s.perm("agumon").topCard.cardId).toBe("BT21-040");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("dualShine").instanceId)).toBe(true);
  });

  it("accepts a normal Arts Digivolve into exact dual ST24-07 from a legal Lv5 host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-06", as: "host" }],
          hand: [{ card: "ST24-07", as: "dualShine" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dualShine").instanceId,
        useAs: "option",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "ST24-07" && s.state.pendingDecision === undefined, 5000);
    expect(s.perm("host").topCard.cardId).toBe("ST24-07");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["ST24-06"]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("dualShine").instanceId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
