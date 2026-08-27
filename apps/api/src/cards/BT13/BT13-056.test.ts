import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-056.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

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
          {
            kind: "Replacement",
            event: "wouldBePlayed",
            sourceFilter: { isSelfRef: true },
            actions: [{ mode: "reduceCost", amount: 4 }],
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

  it("grants Blocker to existing and newly played green Digimon through the opponent's turn (Q2301)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-056", as: "leo" }, { card: "BT13-051", as: "existing" }],
        hand: [{ card: "BT13-051", as: "played" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("played").instanceId));
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("played").instanceId)!;
    expect(observe(s.engine).hasKeyword(s.perm("existing"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(played, "Blocker")).toBe(true);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(played, "Blocker")).toBe(true);
  });
});
