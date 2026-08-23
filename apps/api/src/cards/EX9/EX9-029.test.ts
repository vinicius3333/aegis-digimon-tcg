import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-029.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-029", () => {
  it("has Training and once-per-turn attacks or digivolutions add the top security card after placing a hand card underneath", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.actions).toContainEqual(
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Training" } }),
    );
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "addTop",
            postCostCondition: { kind: "securityAtMostSelfFaceDownDigivolutionCards" },
            cost: { kind: "place", faceDown: true, destination: "digivolutionStack" },
          },
        ],
      });
    }
  });
  it("inherits once-per-turn -2000 DP against an opposing Digimon when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    }));

  it("places a hand card face down and adds the deck top to security after attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-029", as: "source" }], hand: ["BT1-001"], deck: ["BT1-090"], security: [] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    const source = s.perm("source");
    const target = s.perm("target");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "permanent", permanentId: target.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(source.stack).toHaveLength(1);
    expect(source.stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(target.currentDP).toBe(5000);
  });
});
