import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-043.js";
import "../index.js";

describe("BT22-043 Terriermon", () => {
  it("watches self CS digivolution-card additions before playing a CS Tamer", () => {
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({ frequency: "OncePerTurn" });
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controllerDefault: "mine" },
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
            },
            count: 1,
          },
          condition: {
            kind: "permanentCount",
            filter: { controller: "mine", kind: ["Tamer"] },
            op: "lte",
            value: 1,
          },
        },
      ],
    });
  });

  it("keeps the inherited top-to-bottom placement draw effect", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      cost: { kind: "place", target: { filter: { controllerDefault: "mine", kind: ["Digimon"] }, count: 1 } },
    });
  });

  it("implements Q4895 by exposing Terriermon, playing a CS Tamer, and drawing", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009"],
          hand: [{ card: "BT22-091", as: "arata" }],
          battleArea: [{ card: "BT22-046", as: "host", under: ["BT22-044", "BT22-043"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    const terriermon = host.stack.find((card) => card.cardId === "BT22-043")!;
    const source = (s.engine as any).cardSourceOf(terriermon);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT22-043/"))!.effectKey;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: terriermon.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => host.topCard?.cardId === "BT22-043");
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-091")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(host.stack[0]!.cardId).toBe("BT22-046");
  });
});
