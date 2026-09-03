import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT22-044.js";
import "./index.js";

describe("BT22-044 Palmon", () => {
  it("gains memory when effects add a CS Digimon card to this stack", () => {
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({
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
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("does not gain memory for a CS Tamer placed under the stack", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT22-091", as: "tamer" }],
        battleArea: [{ card: "BT22-046", as: "host", under: ["BT22-044"] }],
      },
    });
    await s.ready();
    const initialMemory = s.state.memory;

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("tamer").instanceId]);
    await settle();

    expect(s.state.memory).toBe(initialMemory);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
  });

  it("retains the once-per-turn inherited draw placement cost", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      optional: true,
      cost: {
        kind: "place",
        target: {
          filter: { isSelfRef: true, controllerDefault: "mine", kind: ["Digimon"] },
          count: 1,
          isSelf: true,
        },
      },
    });
  });

  it("implements Q4896 by exposing Palmon, gaining memory, and drawing", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009"],
          battleArea: [{ card: "BT22-046", as: "host", under: ["BT22-043", "BT22-044"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    const palmon = host.stack.find((card) => card.cardId === "BT22-044")!;
    const source = (s.engine as any).cardSourceOf(palmon);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT22-044/"),
    )!.effectKey;
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: palmon.instanceId, effectKey })).toEqual(
      { ok: true },
    );
    await settle(() => host.topCard?.cardId === "BT22-044");
    await settle();

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(host.stack[0]!.cardId).toBe("BT22-046");
  });
});
