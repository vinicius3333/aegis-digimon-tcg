import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-041.js";

describe("BT8-041 Kyukimon", () => {
  it("matches its official effectless metadata and plays normally", async () => {
    expect(getCardDefinition("BT8-041")).toMatchObject({
      nameEn: "Kyukimon",
      colors: ["Yellow", "Purple"],
      level: 5,
      playCost: 7,
      dp: 9000,
      types: ["Mysterious Beast"],
    });
    const s = setupEngine({ 0: { hand: [{ card: "BT8-041", as: "card" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from either a yellow or purple level-4 Digimon for 3 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-051", as: "yellowBase" },
          { card: "BT3-083", as: "purpleBase" },
        ],
        hand: [
          { card: "BT8-041", as: "yellowEvolution" },
          { card: "BT8-041", as: "purpleEvolution" },
        ],
      },
    });
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowBase").permanentId,
        instanceId: s.inst("yellowEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowBase").topCard.cardId === "BT8-041");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleBase").permanentId,
        instanceId: s.inst("purpleEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("purpleBase").topCard.cardId === "BT8-041");

    expect(s.perm("yellowBase").topCard.cardId).toBe("BT8-041");
    expect(s.perm("purpleBase").topCard.cardId).toBe("BT8-041");
    expect(s.state.memory).toBe(1);
  });
});
