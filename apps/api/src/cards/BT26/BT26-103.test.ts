import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT26-103.js";
import "../index.js";

describe("BT26-103 compiled fidelity", () => {
  it("shares the Counter/When Digivolving recovery budget and security-removal penalty while exposing Succession seam", () => {
    const card = getCompiledCard("BT26-103");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "BT26-103/trash-recover" });
    expect(card?.effects?.[1]).toMatchObject({ trigger: "Counter", frequency: "OncePerTurn", sharedUseKey: "BT26-103/trash-recover" });
    expect(card?.effects?.[2]?.actions).toMatchObject([{ kind: "GrantStatic", grant: "effects", duration: "permanent" }]);
    expect(card?.effects?.[3]?.actions).toMatchObject([{ kind: "SubTrigger", event: "whenSecurityRemoved" }, { kind: "SubTrigger", event: "whenEffectRemovesFromSecurity" }]);
  });

  it("trashes one security card and recovers two when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-103", as: "wrathMode" }],
        security: ["BT1-001"],
        deck: ["BT1-002", "BT1-003"],
      },
    });

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("wrathMode"));

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});
