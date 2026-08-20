import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-086.js";

describe("BT22-086 Yao Qinglan", () => {
  it("models the return-gated start-main sequence and empty-board Sangomon condition", () => {
    const start = compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase");
    expect(start?.actions).toHaveLength(2);
    expect(start?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      cost: { kind: "return", to: "deckBottom", target: { filter: { isSelfRef: true } } },
      optional: true,
      abortOnDecline: true,
    });
    expect(start?.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      condition: { kind: "youHaveNone", filter: { kind: ["Digimon"] } },
    });
  });

  it("suspends this Tamer to draw when an effect adds cards to an own Aqua or Sea Animal Digimon", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controllerDefault: "mine" },
      triggerFilter: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }],
      },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true } } },
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
      optional: true,
      abortOnDecline: true,
    });
  });

  it("plays itself from security without cost", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
  });

  it("moves the physical Tamer from hand to battle through the public intent", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT22-086", as: "yao" }] } });
    const id = s.inst("yao").instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: id })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === id));
    expect(s.state.memory).toBe(2);
  });
});
