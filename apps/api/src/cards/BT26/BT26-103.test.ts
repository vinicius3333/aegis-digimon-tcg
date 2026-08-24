import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-103.js";
import "../index.js";

describe("BT26-103 compiled fidelity", () => {
  it("shares the Counter/When Digivolving recovery budget and security-removal penalty while exposing Succession seam", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.keywords).toEqual([
      expect.objectContaining({ keyword: "Piercing" }),
      expect.objectContaining({ keyword: "Reboot" }),
      expect.objectContaining({ keyword: "Blocker" }),
      expect.objectContaining({ keyword: "Succession" }),
    ]);
    expect(card?.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "BT26-103/trash-recover",
    });
    expect(card?.effects?.[1]).toMatchObject({
      trigger: "Counter",
      frequency: "OncePerTurn",
      sharedUseKey: "BT26-103/trash-recover",
    });
    expect(card?.effects?.[2]?.actions).toMatchObject([
      { kind: "GrantStatic", grant: "effects", duration: "permanent" },
    ]);
    expect(card?.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenSecurityRemoved" },
        { kind: "SubTrigger", event: "whenEffectRemovesFromSecurity" },
      ],
    });
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

  it("Q7188: recovers two even with no security card to trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-103", as: "wrathMode" }],
        deck: ["BT1-002", "BT1-003"],
      },
    });

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("wrathMode"));

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("applies the security-removal DP penalty only once across both event routes", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-103", as: "wrathMode" }],
          security: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 16000 },
            { card: "BT1-010", as: "second", dp: 16000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId);
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    preferred.splice(0, preferred.length, s.perm("second").permanentId);
    await advance(s.engine).verb.trashFromSecurity(0, 1);

    expect(s.perm("first").currentDP).toBe(1000);
    expect(s.perm("second").currentDP).toBe(16000);
  });
});
