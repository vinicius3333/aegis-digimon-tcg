import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-081.js";

describe("BT22-081 Eater Eve", () => {
  it("prevents one opponent Digimon from suspending and conditionally places Yuuko", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "PlaceUnder",
        position: "bottom",
        underFilter: { isSelfRef: true },
        condition: { kind: "selfHasNoDigivolutionCards" },
        target: {
          filter: { nameOrTrait: [{ tokens: ["Yuuko Kamishiro"], match: "name" }] },
          from: ["hand", "trash"],
          count: 1,
        },
      });
    }
  });

  it("anchors the leave replacement to this Eater Eve", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          optional: true,
          actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], optional: true }],
        },
      ],
    });
  });

  it("places Yuuko from trash under the publicly played Eater Eve", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT22-081", as: "eve" }], trash: [{ card: "BT22-083", as: "yuuko" }] },
        1: { battleArea: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eveId = s.inst("eve").instanceId;
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: eveId })).toEqual({ ok: true });
    await settle(() => {
      const eve = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === eveId);
      return eve?.stack.some((card) => card.cardId === "BT22-083") === true;
    });
    const eve = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === eveId)!;
    expect(eve.stack.some((card) => card.cardId === "BT22-083")).toBe(true);
  });
});
