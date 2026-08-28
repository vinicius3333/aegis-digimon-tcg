import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-056.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-056", () => {
  it("has Blast Digivolve and places an opposing 8000-DP-or-lower Digimon at the bottom of security on play or digivolution", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({
      keyword: "BlastDigivolve",
      raw: "＜Blast Digivolve＞",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects?.find((entry) => entry.trigger === trigger);
      const action = effect?.actions[0];
      expect(effect?.actions).toHaveLength(1);
      expect(action).toMatchObject({
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "opponent",
        amount: 1,
        abortOnDecline: true,
        cost: { kind: "place", destination: "security", position: "bottom", faceDown: true },
      });
      expect(irNode(action?.cost)?.target?.filter).toMatchObject({ dp: { op: "lte", value: 8000 } });
    }
  });
  it("once per turn prevents a Ver.3 Digimon from leaving by trashing top security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldLeavePlay", mode: "prevent", cost: { kind: "trashSecurityTop" } }],
    }));
  it("allows either player's qualifying Digimon as the bottom-security payment and affects all own Ver.3 leaves", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        abortOnDecline: true,
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "opponent",
        amount: 1,
        cost: {
          targetIsPermanent: true,
          target: { filter: { controller: "any", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 },
          destination: "security",
          position: "bottom",
          faceDown: true,
        },
      });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      affectsAll: true,
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.3"], match: "trait" }] },
      },
    });
  });
  it("places the opposing Digimon at security bottom and trashes that player's top security on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-056", as: "source" }] },
        1: {
          battleArea: [{ card: "EX9-050", as: "target", dp: 4000, under: ["EX9-001"] }],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-011", "EX9-050"]);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
});
