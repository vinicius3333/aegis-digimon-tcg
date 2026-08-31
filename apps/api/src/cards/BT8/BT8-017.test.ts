import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-017.js";

describe("BT8-017 UltimateBrachiomon", () => {
  it("matches its official dual-color effectless metadata and plays normally", async () => {
    expect(getCardDefinition("BT8-017")).toMatchObject({
      nameEn: "UltimateBrachiomon",
      colors: ["Red", "Black"],
      level: 6,
      playCost: 10,
      dp: 13000,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Cyborg", "X Antibody"],
    });
    const s = setupEngine({ 0: { hand: [{ card: "BT8-017", as: "card" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves for 3 from both red and black level-5 Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-014", as: "redBase" },
          { card: "BT2-060", as: "blackBase" },
        ],
        hand: [
          { card: "BT8-017", as: "redEvolution" },
          { card: "BT8-017", as: "blackEvolution" },
        ],
      },
    });
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("redEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("redBase").topCard.cardId === "BT8-017");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackBase").permanentId,
        instanceId: s.inst("blackEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blackBase").topCard.cardId === "BT8-017");

    expect(s.perm("redBase").topCard.cardId).toBe("BT8-017");
    expect(s.perm("blackBase").topCard.cardId).toBe("BT8-017");
    expect(s.state.memory).toBe(1);
  });
});
