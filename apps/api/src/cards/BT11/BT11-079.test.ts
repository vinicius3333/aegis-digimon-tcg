import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-079.js";

describe("BT11-079 DarkLizardmon", () => {
  it("has Retaliation", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-079", as: "darklizardmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("darklizardmon"), "Retaliation")).toBe(true);
  });

  it("draws 1 and then trashes exactly 1 card on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-079", as: "darklizardmon" }],
          hand: [{ card: "BT1-009", as: "old-hand" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("darklizardmon").permanentId]);
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT11-079");
  });
});
