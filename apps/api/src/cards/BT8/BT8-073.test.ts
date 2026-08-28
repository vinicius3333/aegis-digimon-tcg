import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-073.js";

describe("BT8-073 Mushroomon", () => {
  it("matches its official effectless metadata and plays normally", async () => {
    expect(getCardDefinition("BT8-073")).toMatchObject({
      nameEn: "Mushroomon",
      colors: ["Purple"],
      level: 3,
      playCost: 3,
      dp: 4000,
      types: ["Vegetation"],
    });
    const s = setupEngine({ 0: { hand: [{ card: "BT8-073", as: "card" }] } });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a purple level-2 Digimon for 0 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-008", as: "base" }], hand: [{ card: "BT8-073", as: "evolving" }] },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-073");

    expect(s.perm("base").topCard.cardId).toBe("BT8-073");
    expect(s.state.memory).toBe(1);
  });
});
