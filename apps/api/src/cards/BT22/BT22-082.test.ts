import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-082.js";

describe("BT22-082 Eater Adam", () => {
  it("deletes an opposing play-cost-7-or-lower Digimon and places Arata underneath when empty", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], playCost: { op: "lte", value: 7 } }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "PlaceUnder",
        condition: { kind: "selfHasNoDigivolutionCards" },
        underFilter: { isSelfRef: true },
        position: "bottom",
        target: { from: ["hand", "trash"], count: 1 },
      });
    }
  });

  it("anchors the leave replacement to this Eater Adam", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], optional: true }],
        },
      ],
    });
  });

  it("deletes the cost-7 boundary and places Arata from hand under the played Eater", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT22-082", as: "adam" },
            { card: "BT22-091", as: "arata" },
          ],
        },
        1: { battleArea: [{ card: "BT22-014", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const adamId = s.inst("adam").instanceId;
    const victimId = s.perm("victim").permanentId;
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: adamId })).toEqual({ ok: true });
    await settle(() => {
      const adam = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === adamId);
      return adam?.stack.some((card) => card.cardId === "BT22-091") === true;
    });
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId)).toBe(false);
    const adam = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === adamId)!;
    expect(adam.stack.some((card) => card.cardId === "BT22-091")).toBe(true);
  });
});
