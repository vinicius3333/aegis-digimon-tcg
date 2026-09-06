import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-014.js";
import "../index.js";

describe("BT21-014 BurningGreymon", () => {
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

  it("grants Piercing and +3000 DP on play or digivolution, and may evolve into a reduced-cost level 5 Hybrid", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Agunimon"], cost: 1, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
              duration: "forTheTurn",
            },
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 3000,
              duration: "forTheTurn",
            },
          ],
        }),
      );
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSecurityRemoved",
            sourceFilter: { controller: "opponent" },
            fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
            actions: [
              {
                kind: "Digivolve",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                from: ["hand"],
                payCost: true,
                reduceCost: 1,
                optional: true,
                into: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  levels: [5],
                  nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }],
                },
              },
            ],
          },
        ],
      }),
    );
  });

  it("plays for 6 and gains observable +3000 DP and Piercing for the turn", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT21-014", as: "burningGreymon" }] } });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("burningGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-014"));
    const permanent = s.state.players[0]!.battleArea.find((entry) => entry.topCard.cardId === "BT21-014")!;
    expect(permanent.currentDP).toBe(9000);
    expect(observe(s.engine).hasPierce(permanent)).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("digivolves from Agunimon for 1 and receives the same temporary bonuses", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-013", as: "agunimon" }],
        hand: [{ card: "BT21-014", as: "burningGreymon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agunimon").permanentId,
        instanceId: s.inst("burningGreymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agunimon").topCard.cardId === "BT21-014");
    expect(s.perm("agunimon").currentDP).toBe(11000);
    expect(observe(s.engine).hasPierce(s.perm("agunimon"))).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("pays 3 to evolve into a level-5 Hybrid only after opponent security removal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-014", as: "burningGreymon" }],
          hand: [{ card: "BT21-020", as: "aldamon" }],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burningGreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("burningGreymon").topCard.cardId === "BT21-020");
    expect(s.state.memory).toBe(2);
  });

  it("may decline the security-removal evolution without paying memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-014", as: "burningGreymon" }],
          hand: [{ card: "BT21-020", as: "aldamon" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burningGreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.perm("burningGreymon").topCard.cardId).toBe("BT21-014");
    expect(s.state.memory).toBe(5);
  });

  it("grants inherited +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-020", as: "host", dp: 8000, under: ["BT21-014"] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(10000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(8000);
  });
});
