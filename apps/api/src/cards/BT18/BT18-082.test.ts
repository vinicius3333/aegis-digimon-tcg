import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-082.js";

describe("BT18-082 Lucemon: Chaos Mode", () => {
  it("covers opponent choice, recovery fallback, and once-per-turn replacement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Delete", controller: "opponent", optional: true },
        { kind: "SecurityManipulation", op: "addTop", condition: { kind: "ifThisEffectDidNotDelete" } },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldLeavePlay" }],
    });
  });

  it("recovers and trashes the opponent's top security when the optional deletion does not delete", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-082", as: "chaos" }], deck: ["BT1-001"], security: ["BT1-002"] },
        1: { security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("chaos"));

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-003")).toBe(true);
  });

  it("trashes its owner's bottom security to prevent leaving play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-082", as: "chaos" }], security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("chaos").permanentId]);

    expect(s.perm("chaos")).toBeDefined();
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002")).toBe(true);
  });
});
