import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-100.js";

describe("BT6-100 Reinforcing Memory Boost!", () => {
  it("Delay trashes the placed Option and gains 3 memory on a later turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT6-031"],
          hand: [{ card: "BT6-100", as: "option" }],
          deck: ["BT6-032", "BT6-033"],
        },
      },
      { autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));
    const optionPermanent = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === optionId,
    )!;
    s.state.turnCount += 1;
    s.state.memory = 2;
    await s.ready();
    const effects = observe(s.engine).activatableEffects(optionPermanent) as Array<{
      effectKey: string;
      description: string;
    }>;
    const delay = effects.find((effect) => effect.description.includes("Delay"));
    expect(delay).toBeDefined();

    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: optionId, effectKey: delay!.effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 5);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
  });

  it("places itself in the battle area from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT6-100", as: "security", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-100")).toBe(true);
  });

  it("places one revealed card face down on security, adds the other to hand, then places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT6-031"],
          hand: [{ card: "BT6-100", as: "option" }],
          deck: [
            { card: "BT6-032", as: "secured" },
            { card: "BT6-033", as: "added" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0]!;
    s.state.memory = 8;
    const optionInstanceId = s.inst("option").instanceId;
    const securedInstanceId = s.inst("secured").instanceId;
    const addedInstanceId = s.inst("added").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.instanceId === optionInstanceId));

    expect(player.security.map((card) => card.instanceId)).toEqual([securedInstanceId]);
    expect(player.security[0]?.faceUp).toBe(false);
    expect(player.hand.map((card) => card.instanceId)).toContain(addedInstanceId);
    expect(player.deck).toHaveLength(0);
  });
});

describe("BT6-100 Reinforcing Memory Boost! — KB Q&A rulings", () => {
  it("reveals the card it places face down on top of security to the opponent (Q1486)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT6-031"],
          hand: [{ card: "BT6-100", as: "option" }],
          deck: [
            { card: "BT6-032", as: "secured" },
            { card: "BT6-033", as: "added" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0]!;
    s.state.memory = 8;
    const optionId = s.inst("option").instanceId;
    const secured = s.inst("secured");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(player.security.map((card) => card.instanceId)).toEqual([secured.instanceId]);
    expect(player.security[0]?.faceUp).toBe(false);
    const revealedCardIds = s.events
      .filter((event) => event.kind === "cardRevealed" && event.seat === 0)
      .map((event) => (event as { cardId: string }).cardId);
    expect(revealedCardIds).toContain(secured.cardId);
    expect(revealedCardIds).toEqual(["BT6-032", "BT6-033"]);
  });

  it("can be used with 1 or fewer cards in deck, revealing what it can and finishing the effect (Q1487)", async () => {
    const oneCard = setupEngine(
      {
        0: {
          battleArea: ["BT6-031"],
          hand: [{ card: "BT6-100", as: "option" }],
          deck: [{ card: "BT6-032", as: "onlyCard" }],
        },
      },
      { autoSelectCards: true },
    );
    const oneCardPlayer = oneCard.state.players[0]!;
    oneCard.state.memory = 8;
    const oneCardOptionId = oneCard.inst("option").instanceId;

    expect(oneCard.engine.applyIntent(0, { type: "playCard", instanceId: oneCardOptionId })).toEqual({ ok: true });
    await settle(() => oneCardPlayer.battleArea.some((permanent) => permanent.topCard?.instanceId === oneCardOptionId));

    expect(
      oneCard.events
        .filter((event) => event.kind === "cardRevealed" && event.seat === 0)
        .map((event) => (event as { cardId: string }).cardId),
    ).toEqual(["BT6-032"]);
    expect(oneCardPlayer.security.map((card) => card.instanceId)).toEqual([oneCard.inst("onlyCard").instanceId]);
    expect(oneCardPlayer.hand).toHaveLength(0);
    expect(oneCardPlayer.deck).toHaveLength(0);

    const emptyDeck = setupEngine(
      { 0: { battleArea: ["BT6-031"], hand: [{ card: "BT6-100", as: "option" }], deck: [] } },
      { autoSelectCards: true },
    );
    const emptyDeckPlayer = emptyDeck.state.players[0]!;
    emptyDeck.state.memory = 8;
    const emptyDeckOptionId = emptyDeck.inst("option").instanceId;

    expect(emptyDeck.engine.applyIntent(0, { type: "playCard", instanceId: emptyDeckOptionId })).toEqual({ ok: true });
    await settle(() =>
      emptyDeckPlayer.battleArea.some((permanent) => permanent.topCard?.instanceId === emptyDeckOptionId),
    );

    expect(emptyDeckPlayer.security).toHaveLength(0);
    expect(emptyDeckPlayer.hand).toHaveLength(0);
  });
});
