import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-045.js";

describe("BT8-045 Ekakimon", () => {
  it("matches its official effectless metadata and plays normally", async () => {
    expect(getCardDefinition("BT8-045")).toMatchObject({
      nameEn: "Ekakimon",
      colors: ["Green"],
      level: 3,
      playCost: 2,
      dp: 3000,
      types: ["Mutant"],
    });
    const s = setupEngine({ 0: { hand: [{ card: "BT8-045", as: "card" }] } });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a green level-2 Digimon for 0 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-007", as: "base" }], hand: [{ card: "BT8-045", as: "evolving" }] },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-045");

    expect(s.perm("base").topCard.cardId).toBe("BT8-045");
    expect(s.state.memory).toBe(1);
  });
});
