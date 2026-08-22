import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-103.js";

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
});
