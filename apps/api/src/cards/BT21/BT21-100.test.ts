import { describe, expect, it } from "vitest";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-100.js";

describe("BT21-100 The Digimon I Designed", () => {
  it("executes Main draw, hand trash, and battle-area placement when Takato waives the color requirement", async () => {
    const preferred: string[] = [];
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT21-089", as: "takato" }],
          hand: [
            { card: "BT21-100", as: "option" },
            { card: "BT1-009", as: "filler" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("filler").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.length).toBe(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("filler").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("models the Takato waiver, Main draw/trash/place, and separate effect-delete Delay payload", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(staticEffect?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", condition: { kind: "youHave" } });

    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      expect.objectContaining({ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } }),
      { kind: "PlaceInBattleAreaSelf" },
    ]);

    const turns = compiled.effects.filter((entry) => entry.trigger === "YourTurn");
    expect(turns).toHaveLength(2);
    expect(turns[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenEffectDeletes",
      sourceFilter: { kind: ["Digimon"] },
    });
    expect(turns[1]?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(turns[1]?.actions[0]).toMatchObject({ kind: "Digivolve", payCost: false, from: ["trash"], optional: true });
    expect(compiled.effects.some((entry) => entry.trigger === "Security")).toBe(false);
  });
});
