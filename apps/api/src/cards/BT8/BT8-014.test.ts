import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-014.js";

describe("BT8-014 SkullMeramon", () => {
  it("matches its official effectless metadata and plays normally", async () => {
    expect(getCardDefinition("BT8-014")).toMatchObject({
      nameEn: "SkullMeramon",
      colors: ["Red"],
      level: 5,
      playCost: 6,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Flame"],
    });
    const s = setupEngine({ 0: { hand: [{ card: "BT8-014", as: "card" }] } });
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a red level-4 Digimon for 2 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-010", as: "base" }], hand: [{ card: "BT8-014", as: "evolving" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-014");

    expect(s.perm("base").topCard.cardId).toBe("BT8-014");
    expect(s.state.memory).toBe(1);
  });
});
