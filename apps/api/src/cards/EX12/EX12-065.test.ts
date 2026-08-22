import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const CARD_ID = "EX12-065";

describe("EX12-065 Kaguyamon", () => {
  it("maps the catalog, evolution, Fortitude, all-turns keywords, and shared once-per-turn windows", () => {
    const compiled = registeredCompiledCards.get(CARD_ID)!;
    const module = getEffectModule(CARD_ID)!;

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([
      { level: 5, traits: ["Puppet", "Shambala"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Fortitude",
      raw: "＜Fortitude＞",
    });

    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            payCost: false,
            optional: true,
            target: {
              count: 1,
              filter: {
                playCostLte: 5,
                nameOrTrait: [{ tokens: ["Puppet", "Shambala"], match: "trait" }],
              },
            },
          },
        ],
      });
    }

    expect(module.effectsForTiming(EffectTiming.OnPlay, { cardId: CARD_ID, ownerSeat: 0 } as never)).toHaveLength(1);
    expect(
      module.effectsForTiming(EffectTiming.WhenDigivolving, { cardId: CARD_ID, ownerSeat: 0 } as never),
    ).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnUseAttack, { cardId: CARD_ID, ownerSeat: 0 } as never)).toHaveLength(
      1,
    );
  });

  it("plays only a matching low-cost Puppet from trash on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "source" }],
          trash: [
            { card: "BT1-038", as: "valid" },
            { card: "EX12-063", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-038"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining([CARD_ID, "BT1-038"]),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX12-063")).toBe(true);
  });

  it("shares the once-per-turn budget across play and attacking windows", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "source" }],
          trash: [
            { card: "BT1-038", as: "first" },
            { card: "BT11-035", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    const sourceInstanceId = s.inst("source").instanceId;
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-038") &&
        advance(s.engine).ledgers.tracker.count(sourceInstanceId, "EX12-065/ir-shared-0") === 1,
    );

    const source = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === CARD_ID)!;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, source);
    await settle(() => false, 40);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT11-035")).toBe(true);
  });

  it("grants Blocker and Retaliation to own Puppet/TB Digimon only", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "source" },
          { card: "BT1-038", as: "puppet" },
          { card: "EX12-061", as: "tb" },
          { card: "BT1-009", as: "other" },
        ],
      },
    });
    await s.ready();

    for (const keyword of ["Blocker", "Retaliation"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm("source"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("puppet"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("tb"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("other"), keyword)).toBe(false);
    }
  });

  it("returns the opponent's lowest-level Digimon to the bottom of the deck on deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-010", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDestroyedAnyone, s.perm("source"));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009"));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
  });
});
