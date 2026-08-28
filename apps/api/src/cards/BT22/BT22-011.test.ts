import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-011.js";

describe("BT22-011 BlueMeramon", () => {
  it("gates the once-per-turn Flame play and follow-up attack behind paying 3 memory", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ frequency: "OncePerTurn" });
    expect(main?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "payMemory", memory: 3 },
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          playCostLte: 5,
          nameOrTrait: [{ tokens: ["Flame"], match: "trait" }],
        },
      },
    });
    expect(main?.actions[1]).toMatchObject({
      kind: "Attack",
      target: { filter: { isSelfRef: true }, isSelf: true },
      optional: true,
    });

    const inherited = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(inherited).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Alliance" },
          duration: "permanent",
          target: { filter: { isSelfRef: true, nameOrTrait: [{ tokens: ["Flame", "CS"], match: "trait" }] } },
        },
      ],
    });
  });

  it("pays exactly 3 and plays one eligible Flame Digimon from trash through public Main activation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-011", as: "blueMeramon" }],
          trash: [
            { card: "BT22-010", as: "eligible" },
            { card: "BT1-009", as: "nonmatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const source = (
      s.engine as unknown as { cardSourceOf(card: object): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.perm("blueMeramon").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT22-011/"),
    )!.effectKey;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      { ok: true },
    );
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-010"));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-010")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("nonmatch").instanceId]);
  });

  it("grants Alliance to a CS inherited host only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT22-013", under: ["BT22-011"], as: "host" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(true);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(false);
  });
});
