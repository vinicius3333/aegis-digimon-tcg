import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-066.js";

describe("BT22-066 Raidenmon", () => {
  it("may unsuspend or suspend any Digimon on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Unsuspend",
        optional: true,
        target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "Suspend",
        optional: true,
        target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("De-Digivolves an opposing Digimon when an own Ver.5 Digimon suspends", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.5"], match: "trait" }] },
          actions: [
            {
              kind: "DeDigivolve",
              amount: 1,
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("suspends itself on play and De-Digivolves through the resulting Ver.5 suspension", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT22-066", as: "raidenmon" }] },
        1: { battleArea: [{ card: "BT22-071", as: "target", under: ["BT22-068"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const target = s.perm("target");
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("raidenmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => target.topCard?.cardId === "BT22-068");

    expect(s.state.players[0]!.battleArea[0]!.isSuspended).toBe(true);
    expect(target.topCard?.cardId).toBe("BT22-068");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT22-071")).toBe(true);
  });
});
