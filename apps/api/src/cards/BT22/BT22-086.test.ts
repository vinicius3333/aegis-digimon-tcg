import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT22-086.js";

describe("BT22-086 Yao Qinglan", () => {
  it("models the return-gated start-main sequence and empty-board Sangomon condition", () => {
    const start = compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase");
    expect(start?.actions).toHaveLength(1);
    expect(start?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "return", to: "deckBottom", target: { filter: { isSelfRef: true } } },
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], optional: true },
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          condition: { kind: "youHaveNone", filter: { kind: ["Digimon"] } },
        },
      ],
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

  it("returns itself before playing Sangomon even without another Yao in hand", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-086", as: "yao" }], trash: [{ card: "BT22-018", as: "sangomon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-018"));

    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT22-086")).toBe(true);
  });

  it("draws when a public digivolve adds a card to an Aqua/Sea Animal Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-086", as: "yao" },
            { card: "BT1-033", under: [{ card: "BT22-069", as: "added" }], as: "base" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("base").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("added").instanceId],
    });
    await settle(() => s.perm("yao").isSuspended && s.state.players[0]!.hand.length > 0, 400);

    expect(s.perm("yao").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});
