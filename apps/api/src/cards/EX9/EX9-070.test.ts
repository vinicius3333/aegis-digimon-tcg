import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-070.js";

describe("EX9-070", () => {
  it("waives its color requirement while a DM Digimon or Tamer is present", () => expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave" } }] }));
  it("has the draw-and-enter main effect", () => expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toEqual([{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }]));
  it("can digivolve a DM Digimon by two after placing a hand card underneath", () => expect(compiled.effects?.filter((entry) => entry.trigger === "Main")[1]).toMatchObject({ actions: [{ kind: "Digivolve", reduceCost: 2, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } }] }));
  it("draws and enters the battle area from security", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "Draw", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }] }));

  it("draws and places itself as a battle-area option when activated from hand", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-007", as: "dm" }], hand: [{ card: "EX9-070", as: "option" }], deck: [{ card: "BT1-009", as: "drawn" }] } },
      { autoDeclineOptional: true },
    );

    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
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
});
