import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-056.js";
import "./BT13-052.js";
import "./BT13-055.js";
import "./BT13-051.js";
import "./BT13-040.js";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = observe(s.engine).cardSource(s.perm("leo"));
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
          battleArea: [{ card: "BT13-055", as: "leo" }],
          hand: [
            { card: "BT13-056", as: "evolution" },
            { card: "BT13-052", as: "green" },
          ],
          deck: [{ card: "BT1-010", as: "bonus" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const baseId = s.perm("leo").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("leo").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("green").instanceId));

    expect(s.state.memory).toBe(6);
    expect(s.perm("leo").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
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
          battleArea: [{ card: "BT13-055", as: "leo" }],
          hand: [
            { card: "BT13-056", as: "evolution" },
            { card: "BT13-052", as: "green" },
            { card: "BT13-040", as: "royal" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    const baseId = s.perm("leo").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("leo").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("green").instanceId));

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("leo").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }).ok,
    ).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("royal").instanceId)).toBe(true);
    expect(s.state.memory).toBe(6);
    expect(s.perm("leo").stack.map((card) => card.instanceId)).toEqual([baseId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("leo").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("royal").instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.perm("leo").stack.map((card) => card.instanceId)).toEqual([baseId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("grants Blocker to existing and newly played green Digimon through the opponent's turn (Q2301)", async () => {
    // Mikemon's own [On Play] asks for a Piercing target; auto-select it so Leopardmon's
    // whenPlayed grant, queued behind that decision, resolves.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-056", as: "leo" },
            { card: "BT13-051", as: "existing" },
          ],
          hand: [{ card: "BT13-051", as: "played" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("played").instanceId),
    );
    await s.ready();
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("played").instanceId)!;
    expect(observe(s.engine).hasKeyword(s.perm("existing"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(played, "Blocker")).toBe(true);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(played, "Blocker")).toBe(true);
  });
});
