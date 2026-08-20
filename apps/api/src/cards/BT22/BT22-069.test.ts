import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-069.js";
import "../index.js";

describe("BT22-069 Lunamon", () => {
  it("reveals three and adds Night Claw plus Light Fang or Galaxy", () => {
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { filter: { nameOrTrait: [{ tokens: ["Night Claw"], match: "trait" }] }, count: 1, to: "hand" },
        { filter: { nameOrTrait: [{ tokens: ["Light Fang", "Galaxy"], match: "trait" }] }, count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    });
  });

  it("keeps the once-per-turn inherited stack placement draw", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Main",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Draw",
          amount: 1,
          optional: true,
          cost: {
            kind: "place",
            target: { filter: { nameOrTrait: [{ tokens: ["Night Claw", "Light Fang"], match: "trait" }] } },
          },
        },
      ],
    });
  });

  it("adds one card from each reveal bucket and bottoms the miss through public play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT22-069", as: "lunamon" }],
          deck: ["BT22-072", "EX5-007", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lunamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT22-072"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT22-072", "EX5-007"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-001"]);
  });

  it("restacks its host's top card as the bottom source and draws through public activation", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT22-001"],
          battleArea: [{ card: "BT22-072", as: "host", under: ["BT22-069", "BT22-071"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    const lunamon = host.stack.find((card) => card.cardId === "BT22-069")!;
    const source = (s.engine as any).cardSourceOf(lunamon);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT22-069/"),
    )!.effectKey;
    const initialTop = host.topCard!.instanceId;
    const initialTopUnder = host.stack.at(-1)!.instanceId;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: lunamon.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT22-001"));

    expect(host.topCard!.instanceId).toBe(initialTopUnder);
    expect(host.stack[0]!.instanceId).toBe(initialTop);
  });
});
