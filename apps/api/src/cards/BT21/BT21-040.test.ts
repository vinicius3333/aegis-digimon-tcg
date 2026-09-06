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
        0: { battleArea: [{ card: "BT13-018", as: "host", under: ["BT21-040"] }] },
      });
      s.state.turnSeat = turnSeat;
      await s.ready();

      expect(s.perm("host").currentDP).toBe(turnSeat === 0 ? 14000 : 12000);
    }
  });
});
