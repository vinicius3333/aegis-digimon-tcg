import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-038.js";
import "../index.js";

describe("BT21-038 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("preserves Evade and the WG alternate Digivolution cost", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Evade", raw: "＜Evade＞" }] }),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["WG"], cost: 2, isAlternate: true }]);
  });

  it("optionally unsuspends one of your WG Digimon on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toEqual([
        {
          kind: "Unsuspend",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["WG"], match: "trait" }] },
            count: 1,
          },
          optional: true,
        },
      ]);
    }
  });

  it("prevents this Digimon's attack target from changing during your turn when inherited", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited);
    expect(inherited).toEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "Restrict",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            restriction: "attackTargetChange",
            duration: "permanent",
          },
        ],
      }),
    );
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "optionally unsuspends exactly one WG Digimon at %s",
    async (timing) => {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT21-038", as: "deramon" },
              { card: "BT21-034", as: "wg", suspended: true },
              { card: "BT1-009", as: "nonWg", suspended: true },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
      );
      preferInstanceIds.push(s.perm("wg").permanentId);
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("deramon"));

      expect(s.perm("wg").isSuspended).toBe(false);
      expect(s.perm("nonWg").isSuspended).toBe(true);
    },
  );

  it("may decline the unsuspend", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-038", as: "deramon" },
            { card: "BT21-034", as: "wg", suspended: true },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("deramon"));

    expect(s.perm("wg").isSuspended).toBe(true);
  });

  it("unsuspends a WG Digimon from the public play action", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-034", as: "wg", suspended: true }],
          hand: [{ card: "BT21-038", as: "deramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-038"));
    expect(s.perm("wg").isSuspended).toBe(false);
    expect(s.state.memory).toBe(4);
  });

  it("evolves from a level-3 WG Digimon for 2 and can unsuspend itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-033", as: "floramon", suspended: true }],
          hand: [{ card: "BT21-038", as: "deramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("floramon").permanentId,
        instanceId: s.inst("deramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("floramon").topCard.cardId === "BT21-038");

    expect(s.state.memory).toBe(1);
    expect(s.perm("floramon").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("floramon"), "Evade")).toBe(true);
  });

  it("rejects the alternate evolution from a non-WG level-3 base without paying", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "BT21-038", as: "deramon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("deramon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.cardId).toBe("BT1-009");
  });

  it("does not unsuspend an opponent WG or a non-WG own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "ownNonWg", suspended: true }],
          hand: [{ card: "BT21-038", as: "deramon" }],
        },
        1: { battleArea: [{ card: "BT21-034", as: "opponentWg", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("deramon").instanceId),
    );
    expect(s.perm("ownNonWg").isSuspended).toBe(true);
    expect(s.perm("opponentWg").isSuspended).toBe(true);
  });

  it("applies the inherited attack-target lock only on its controller's turn", async () => {
    for (const turnSeat of [0, 1] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT21-039", as: "host", under: ["BT21-038"] }] },
      });
      s.state.turnSeat = turnSeat;
      await s.ready();

      expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(turnSeat === 0);
    }
  });
});
