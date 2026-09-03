import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX1-027.js";

describe("EX1-027 Leomon", () => {
  it("recovers 1 after its security battle with 3 or fewer security cards", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "EX1-027", as: "leomon", faceUp: true }, "BT1-001", "BT1-001"],
        deck: [{ card: "BT1-009", as: "recovered" }],
      },
    });
    const recoveredId = s.inst("recovered").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("leomon"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === recoveredId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(4);
  });

  it("does not recover when its owner has more than 3 security cards", async () => {
    const s = setupEngine({
      0: {
        security: [
          { card: "EX1-027", as: "leomon", faceUp: true },
          "BT1-001",
          "BT1-001",
          "BT1-001",
          "BT1-001",
        ],
        deck: [{ card: "BT1-009", as: "deckTop" }],
      },
    });
    const deckTopId = s.inst("deckTop").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("leomon"));

    expect(s.state.players[0]!.security).toHaveLength(5);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === deckTopId)).toBe(true);
  });

  it("counts the checked card as removed for the 3-or-fewer condition (Q3211)", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "EX1-027", as: "leomon", faceUp: true }, "BT1-001", "BT1-001", "BT1-001"],
        deck: [{ card: "BT1-009", as: "recovered" }],
      },
    });
    const recoveredId = s.inst("recovered").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("leomon"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === recoveredId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(5);
  });
});
