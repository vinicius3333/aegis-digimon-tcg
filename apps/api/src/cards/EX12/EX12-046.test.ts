import { EffectTiming, assemblyRequirementFor, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-046 Shishimamon", () => {
  it("applies the printed On Play debuff to one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-046", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("assembles with one level-4-or-lower TB card for the printed two-cost reduction", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX12-046", as: "source" }],
        trash: [{ card: "BT26-012", as: "material" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        assembly: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-046"));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-046")!;
    expect(s.state.memory).toBe(0);
    expect(played.stack.map((card) => card.cardId)).toEqual(["BT26-012"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("digivolves only for an opponent security removal and reduces the evolution cost by two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-046", as: "source" }],
          hand: [{ card: "EX12-047", as: "target" }],
          security: ["BT1-010"],
        },
        1: { security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("source").topCard?.cardId).toBe("EX12-046");

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => s.perm("source").topCard?.cardId === "EX12-047");

    expect(s.perm("source").topCard?.cardId).toBe("EX12-047");
    expect(s.state.memory).toBe(-1);
  });

  it("plays a qualifying TB Digimon from hand at End of Attack through the inherited effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "source", under: ["EX12-046"] }],
          hand: [{ card: "EX12-009", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    expect(
      getEffectModule("EX12-046")?.effectsForTiming(EffectTiming.OnEndAttack, s.perm("source") as never),
    ).toHaveLength(1);
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("source"), {
      attackerPermanentId: s.perm("source").permanentId,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-009"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-009")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(false);
  });

  it("maps the catalog, evolution, Assembly, timing direction, debuff, and inherited clause", () => {
    const card = getCardDefinition("EX12-046");
    const compiled = registeredCompiledCards.get("EX12-046")!;
    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    const inherited = compiled.effects.find((effect) => effect.isInherited)!;

    expect(card?.effectText).toContain("your opponent's security stack is removed from");
    expect(card?.inheritedEffectText).toContain("5000 DP or less");
    expect(digivolutionRequirementsFor("EX12-046")).toEqual([
      { level: 4, traits: ["Shambala"], cost: 3, isAlternate: true },
    ]);
    expect(assemblyRequirementFor("EX12-046")).toEqual([
      { reduceCost: 2, materials: [{ traits: ["TB"], levelMax: 4, count: 1 }] },
    ]);
    expect(yourTurn.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      sourceFilter: { controller: "opponent" },
      actions: [
        {
          kind: "Digivolve",
          into: { nameOrTrait: [{ tokens: ["TB"], match: "trait" }] },
          reduceCost: 2,
          optional: true,
        },
      ],
    });
    expect(inherited).toMatchObject({
      trigger: "EndOfAttack",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          target: {
            filter: {
              kind: ["Digimon"],
              dp: { op: "lte", value: 5000 },
              nameOrTrait: [{ tokens: ["TB"], match: "trait" }],
            },
          },
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
