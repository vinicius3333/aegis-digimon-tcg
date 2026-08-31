import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-190.js";

describe("P-190 Tweetmon", () => {
  it("encodes Appmon evolution and Link requirements", () => {
    const card = runtimeCompiledCard("P-190")!;
    expect(card.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(card.linkRequirement).toEqual([{ cost: 1, traits: ["Appmon"] }]);
  });

  it("links from trash or a digivolution stack and draws when linked", () => {
    const card = runtimeCompiledCard("P-190")!;
    expect(card.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "Link",
          from: ["trash", "digivolutionCards"],
          optional: true,
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              hasLinkRequirement: true,
              hostFilter: { isSelfRef: true },
            },
          },
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          event: "whenLinked",
          on: { filter: { isSelfRef: true } },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
  });

  it("draws on play", () => {
    expect(runtimeCompiledCard("P-190")!.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    });
  });
});
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-190 engine behavior", () => {
  it("draws the top card when played", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "P-190", as: "demiveemon" }], deck: [{ card: "BT1-001", as: "drawn" }] },
    });
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demiveemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
