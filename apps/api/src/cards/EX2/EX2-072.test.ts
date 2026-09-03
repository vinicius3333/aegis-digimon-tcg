import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-072.js";

describe("EX2-072 Blue Card", () => {
  it("reveals five and adds a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-060", "EX2-046"],
          hand: [{ card: "EX2-072", as: "option" }],
          deck: [{ card: "EX2-019", as: "digimon" }, "BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("digimon").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("digimon").instanceId)).toBe(true);
  });

  it("may digivolve a compatible Digimon into a revealed non-white Digimon without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-019", as: "renamon" },
            { card: "EX2-060", as: "rika" },
            { card: "EX2-046", as: "whiteSource" },
          ],
          hand: [{ card: "EX2-072", as: "blueCard" }],
          deck: [
            { card: "EX2-021", as: "kyubimon" },
            "EX2-066",
            "EX2-067",
            "EX2-068",
            "EX2-069",
            { card: "BT1-001", as: "bonusDraw" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderCards: true,
        autoOrderTriggers: true,
      },
    );
    s.state.memory = 10;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blueCard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("renamon").topCard.instanceId === s.inst("kyubimon").instanceId);

    expect(s.perm("renamon").topCard.cardId).toBe("EX2-021");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    // Blue Card pays 3 and the revealed digivolution is free. The standalone
    // Renamon is not an evolution source, so its inherited effect does not apply.
    expect(s.state.memory).toBe(memoryBefore - 3);
  });
});
