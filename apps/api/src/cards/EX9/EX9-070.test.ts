import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-070.js";

describe("EX9-070", () => {
  it("waives its color requirement while a DM Digimon or Tamer is present", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave" } }],
    }));
  it("has the draw-and-enter main effect", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "PlaceInBattleAreaSelf" },
    ]));
  it("can digivolve any own DM Digimon by two after placing a hand card underneath", () =>
    expect(compiled.effects?.filter((entry) => entry.trigger === "Main")[1]).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DM"], match: "trait" }] },
            fromSelectionRef: "paidHost",
          },
          reduceCost: 2,
          cost: {
            kind: "place",
            host: "target",
            underFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DM"], match: "trait" }] },
            bindHostAs: "paidHost",
            faceDown: true,
            destination: "digivolutionStack",
          },
        },
      ],
    }));
  it("draws and enters the battle area from security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "Draw", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }],
    }));

  it("draws and places itself as a battle-area option when activated from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-007", as: "dm" }],
          hand: [{ card: "EX9-070", as: "option" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );

    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId), 20);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX9-070"), 20);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX9-070")).toBe(true);
  });

  it("draws and places itself as a battle-area option from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "EX9-070", as: "option", faceUp: true }], deck: [{ card: "BT1-009", as: "drawn" }] } },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-070");
  });
  it("activates Delay to place a hand card face-down and digivolve a DM Digimon", async () => {
    const options = {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
      preferInstanceIds: [] as string[],
    };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-070", as: "option" },
            { card: "EX9-007", as: "host" },
          ],
          hand: [
            { card: "BT1-009", as: "under" },
            { card: "EX9-010", as: "evo" },
          ],
        },
      },
      options,
    );
    options.preferInstanceIds.push(s.inst("under").instanceId);
    s.state.memory = 3;
    await s.ready();

    const effect = JSON.parse(s.perm("option").activatableEffectsJson || "[]").find((entry: { description?: string }) =>
      /Delay/i.test(entry.description ?? ""),
    );
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("option").topCard.instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "EX9-010" && s.perm("host").stack.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([]);
    expect(s.perm("host").topCard.cardId).toBe("EX9-010");
    expect(
      s.state.players[0]!.battleArea.map((permanent) => ({
        top: permanent.topCard.cardId,
        stack: permanent.stack.map((card) => card.cardId),
      })),
    ).toEqual([{ top: "EX9-010", stack: ["BT1-009", "EX9-007"] }]);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT1-009" && card.faceUp === false)).toBe(true);
  });
});
