import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-055.js";

describe("BT23-055 Cyberdramon", () => {
  it("deletes at the printed play-cost boundary and leaves a cost-6 Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-055", as: "cyber" }] },
        1: {
          battleArea: [
            { card: "BT1-020", as: "cost5" },
            { card: "BT1-019", as: "cost6" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 10;
    const cost5Id = s.perm("cost5").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyber").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === cost5Id));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-020")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-019")).toBe(true);
  });

  it("trashes an effect-placed Option to prevent leaving once, then leaves on the next attempt", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-055", as: "cyber" }],
          hand: [{ card: "BT23-100", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const cyberId = s.perm("cyber").permanentId;
    const optionId = s.inst("option").instanceId;
    await advance(s.engine).verb.placeOptionAsPermanent(optionId);

    expect(await advance(s.engine).verb.deletePermanent([cyberId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === cyberId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);

    expect(await advance(s.engine).verb.deletePermanent([cyberId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === cyberId)).toBe(false);
  });

  it("deletes one opposing Digimon with play cost 5 or less on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", playCostLte: 5 }, count: 1 },
      });
    }
  });

  it("once per turn prevents its own departure by trashing an effect-played Option in the battle area", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited) as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      cost: {
        kind: "trash",
        target: {
          filter: { zone: "battleArea", controller: "mine", kind: ["Option"], placedInBattleAreaByEffect: true },
          count: 1,
        },
      },
    });
  });

  it("preserves the inherited Cyberdramon/Justimon/CS protection replacement", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.isInherited) as any;
    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { controllerDefault: "mine", kind: ["Digimon"] },
        },
      ],
    });
  });
});
