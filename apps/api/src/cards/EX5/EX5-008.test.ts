import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-008.js";
import "../index.js";

describe("EX5-008 Firamon", () => {
  it("reveals three and adds one Light Fang and one Night Claw/Galaxy card", () => {
    const effects = compiled.effects?.filter(
      (entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving",
    );
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckBottom",
        add: [
          { filter: { controllerDefault: "mine", nameOrTrait: [{ match: "trait", tokens: ["Light Fang"] }] } },
          {
            filter: { controllerDefault: "mine", nameOrTrait: [{ match: "trait", tokens: ["Night Claw", "Galaxy"] }] },
          },
        ],
      });
    }
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: 2000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });

  it("adds both available trait cards from three reveals and leaves the rest on deck bottom", async () => {
    const both = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-008", as: "firamon" }],
          deck: [
            { card: "EX5-007", as: "lightFang" },
            { card: "EX5-065", as: "nightClaw" },
            { card: "BT1-009", as: "filler" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await both.ready();
    both.state.memory = 4;
    expect(both.engine.applyIntent(0, { type: "playCard", instanceId: both.inst("firamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        both.state.players[0]!.hand.some((card) => card.instanceId === both.inst("lightFang").instanceId) &&
        both.state.players[0]!.hand.some((card) => card.instanceId === both.inst("nightClaw").instanceId),
      500,
    );
    expect(both.state.players[0]!.hand.some((card) => card.instanceId === both.inst("lightFang").instanceId)).toBe(
      true,
    );
    expect(both.state.players[0]!.hand.some((card) => card.instanceId === both.inst("nightClaw").instanceId)).toBe(
      true,
    );
    expect(both.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([both.inst("filler").instanceId]);

    const onlyLight = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-008", as: "firamon" }],
          deck: ["EX5-007", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await onlyLight.ready();
    onlyLight.state.memory = 4;
    expect(
      onlyLight.engine.applyIntent(0, { type: "playCard", instanceId: onlyLight.inst("firamon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => onlyLight.state.players[0]!.hand.some((card) => card.cardId === "EX5-007"), 500);
    expect(onlyLight.state.players[0]!.hand.some((card) => card.cardId === "EX5-007")).toBe(true);
    expect(onlyLight.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(false);
    expect(onlyLight.state.players[0]!.deck).toHaveLength(2);
  });
});
