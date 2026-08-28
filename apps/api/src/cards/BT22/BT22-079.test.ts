import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-079.js";

describe("BT22-079 Eater (Species Form)", () => {
  it("has Blocker and draws one card on play", () => {
    const blocker = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(blocker?.keywords).toEqual([{ keyword: "Blocker", raw: "＜Blocker＞" }]);

    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions).toEqual([]);
    expect(onPlay?.keywords).toEqual([{ keyword: "Draw", amount: 1, raw: "＜Draw 1＞" }]);
  });

  it("reduces an owned Eater Digimon's play cost only during your turn in breeding", () => {
    const inherited = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(inherited).toMatchObject({
      isInherited: true,
      isBreeding: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Eater"], match: "trait" }],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 1,
              optional: true,
            },
          ],
        },
      ],
    });
  });

  it("draws on public play and its breeding source reduces a later Eater play exactly once", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-009", under: ["BT22-079"] },
          hand: [{ card: "BT22-079", as: "eater" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true },
    );
    const eaterId = s.inst("eater").instanceId;
    s.state.memory = 3;
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: eaterId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001"));
    expect(s.decisions).toHaveLength(1);
    expect(s.decisions[0]?.req).toMatchObject({ kind: "optional", sourceCardId: "BT22-079" });
    expect(s.state.memory).toBe(1);
  });
});
