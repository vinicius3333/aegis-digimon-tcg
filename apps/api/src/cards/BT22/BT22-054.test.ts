import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-054.js";
import "./index.js";

describe("BT22-054 Hagurumon", () => {
  it("reduces any opposing Digimon only when a CS card is added to this Digimon's stack", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, colors: ["Black"], cost: 1, isAlternate: false },
      { level: 2, colors: ["Yellow"], cost: 1, isAlternate: false },
      { level: 2, traits: ["CS"], cost: 0, isAlternate: true },
    ]);
    const watcher = compiled.effects.find((entry) => entry.trigger === "YourTurn");

    expect(watcher).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controllerDefault: "mine" },
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: {
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
          },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -3000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    });
  });

  it("restacks this CS Digimon before drawing and supports the zero-cost CS evolution", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);

    expect(inherited).toMatchObject({
      trigger: "Main",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Draw",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            raw: "By placing this [CS] trait Digimon's top stacked card as its bottom digivolution card",
          },
        },
      ],
    });
    expect(compiled.digivolutionRequirement).toContainEqual({
      level: 2,
      traits: ["CS"],
      cost: 0,
      isAlternate: true,
    });
  });

  it("pays the inherited Main cost from its own stack and draws through a public intent", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009"],
          battleArea: [{ card: "BT22-056", as: "host", under: ["BT22-043", "BT22-054"] }],
        },
        1: { battleArea: [{ card: "BT22-071", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    const hagurumon = host.stack.find((card) => card.cardId === "BT22-054")!;
    const source = observe(s.engine).cardSource(hagurumon);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT22-054/"),
    )!.effectKey;
    const initialHand = s.state.players[0]!.hand.length;
    const initialTopUnder = host.stack.at(-1)!.instanceId;
    const initialTop = host.topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: hagurumon.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === initialHand + 1);

    expect(s.state.players[0]!.hand).toHaveLength(initialHand + 1);
    expect(host.topCard!.instanceId).toBe(initialTopUnder);
    expect(host.topCard!.cardId).toBe("BT22-054");
    expect(host.stack[0]!.instanceId).toBe(initialTop);
    expect(s.perm("opponent").currentDP).toBe(3000);
  });

  it("does not reduce DP when a public digivolution adds a non-CS card to its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", under: ["BT22-054"], as: "host" }],
        hand: [{ card: "BT1-014", as: "evolution" }],
      },
      1: { battleArea: [{ card: "BT22-071", as: "opponent" }] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-014");

    expect(s.perm("opponent").currentDP).toBe(6000);
  });
});

describe("BT22-054 Hagurumon — KB Q&A rulings", () => {
  async function restackWithHagurumonInherited(under: string[]) {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009"],
          battleArea: [{ card: "BT22-056", as: "host", under }],
        },
        1: { battleArea: [{ card: "BT22-071", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const host = s.perm("host");
    const hagurumon = host.stack.find((card) => card.cardId === "BT22-054")!;
    const inheritedDraw = observe(s.engine)
      .activatableEffects(host)
      .find((effect) => effect.instanceId === hagurumon.instanceId && effect.effectKey.startsWith("BT22-054/"));
    expect(inheritedDraw).toBeDefined();
    const initialHand = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: hagurumon.instanceId,
        effectKey: inheritedDraw!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === initialHand + 1);
    return s;
  }

  it("triggers its [Your Turn] effect when the restack makes this card the top card (Q4907)", async () => {
    const becomesTop = await restackWithHagurumonInherited(["BT1-009", "BT22-054"]);
    expect(becomesTop.perm("host").topCard.cardId).toBe("BT22-054");
    expect(becomesTop.perm("host").stack[0]!.cardId).toBe("BT22-056");
    expect(becomesTop.perm("opponent").currentDP).toBe(3000);

    const staysUnder = await restackWithHagurumonInherited(["BT22-054", "BT1-009"]);
    expect(staysUnder.perm("host").topCard.cardId).toBe("BT1-009");
    expect(staysUnder.perm("opponent").currentDP).toBe(6000);
  });
});
