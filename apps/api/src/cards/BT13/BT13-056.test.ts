import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-056.js";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = (s.engine as any).cardSourceOf(s.perm("leo").topCard!);
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT13-056/"))!
    .effectKey;
}

describe("BT13-056 Leopardmon", () => {
  it("shares the once-per-turn play effect across both timings and grants Blocker dynamically", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    const first = compiled.effects[0]!;
    const second = compiled.effects[1]!;
    for (const effect of [first, second]) {
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: true,
            reduceCostBy: 4,
            optional: true,
            target: {
              filter: {
                controllerDefault: "mine",
                or: [
                  { colors: ["Green"], kind: ["Digimon"] },
                  { nameOrTrait: [{ match: "trait", tokens: ["Royal Knight"] }], kind: ["Digimon"] },
                ],
              },
              count: 1,
            },
          },
        ],
      });
    }
    expect(first.trigger).toBe("WhenDigivolving");
    expect(second.trigger).toBe("Main");
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controllerDefault: "mine", excludeSelf: true, kind: ["Digimon"] },
          actions: [
            {
              kind: "GainKeyword",
              keyword: { keyword: "Blocker" },
              duration: "untilOpponentTurnEnd",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  or: [
                    { colors: ["Green"], kind: ["Digimon"] },
                    { nameOrTrait: [{ match: "trait", tokens: ["Royal Knight"] }], kind: ["Digimon"] },
                  ],
                },
                count: "all",
              },
            },
          ],
        },
      ],
    });
  });

  it("loads the compiled Leopardmon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-056", as: "leo" }] } });
    await s.ready();
    expect(s.perm("leo").topCard?.cardId).toBe("BT13-056");
  });

  it("plays a green hand card from When Digivolving and pays its play cost reduced by 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-056", as: "leo" }],
          hand: [{ card: "BT13-052", as: "green" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("leo"));
    await settle(() => s.perm("green").topCard?.cardId === "BT13-052");

    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("green").instanceId)).toBe(false);
  });

  it("plays a Royal Knight hand card from Main and pays its play cost reduced by 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-056", as: "leo" }],
          hand: [{ card: "BT13-056", as: "royal" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("leo").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("royal").instanceId),
    );

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("royal").instanceId)).toBe(false);
  });

  it("shares the Once Per Turn play allowance between When Digivolving and Main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-056", as: "leo" }],
          hand: [
            { card: "BT13-052", as: "green" },
            { card: "BT13-040", as: "royal" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const mainKey = mainEffectKey(s);

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("leo"));
    await settle(() => s.perm("green").topCard?.cardId === "BT13-052");

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("leo").topCard!.instanceId,
        effectKey: mainKey,
      }).ok,
    ).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("royal").instanceId)).toBe(true);
  });

  it("grants Blocker to existing and newly played green Digimon through the opponent's turn (Q2301)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-056", as: "leo" },
          { card: "BT13-051", as: "existing" },
        ],
        hand: [{ card: "BT13-051", as: "played" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("played").instanceId),
    );
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("played").instanceId)!;
    expect(observe(s.engine).hasKeyword(s.perm("existing"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(played, "Blocker")).toBe(true);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(played, "Blocker")).toBe(true);
  });
});
