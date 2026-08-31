import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-193.js";

describe("P-193 The Wicked God Emerges!", () => {
  it("gates Draw 2 and battle-area placement behind trashing a Composite or Wicked God card", () => {
    expect(runtimeCompiledCard("P-193")!.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [{ tokens: ["Composite", "Wicked God"], match: "trait" }],
              },
            },
          },
          abortOnDecline: true,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("delays a Wicked God play behind deleting your Millenniummon and activates Main from Security", () => {
    const card = runtimeCompiledCard("P-193")!;
    expect(card.effects.find((effect) => effect.trigger === "EndOfAllTurns")).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          cost: {
            kind: "deleteOwn",
            target: { count: 1, filter: { nameOrTrait: [{ tokens: ["Millenniummon"], match: "name" }] } },
          },
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Wicked God"], match: "trait" }],
            },
          },
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });

  it("draws two after paying the Composite/Wicked God hand cost and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-193", as: "option" }, { card: "BT19-065", as: "cost" }, "BT1-001"],
          battleArea: [{ card: "BT19-065", as: "color" }],
          deck: ["BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) =>
        perm.stack.some((card) => card.instanceId === s.inst("option").instanceId),
      ),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-002")).toBe(true);
  });
});
