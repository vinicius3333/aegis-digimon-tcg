import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-044.js";

describe("BT11-044 MetalEtemon", () => {
  it("maps the catalog and reveals exactly four for optional eligible play under the shared cost budget", () => {
    expect(getCardDefinition("BT11-044")).toMatchObject({ cardId: "BT11-044", colors: ["Yellow", "Black"], level: 6, playCost: 11, dp: 11000, types: ["Cyborg"] });
    expect(compiled.effects).toEqual([{ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 4, rest: "trash" })] }, { trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 4, rest: "trash" })] }]);
  });

  it("may play eligible revealed Digimon totaling less than 7 and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-044", as: "metalEtemon" }],
          deck: [
            { card: "BT11-036", as: "chuumon" },
            { card: "BT11-040", as: "sukamon" },
            { card: "BT11-023", as: "rest1" },
            { card: "BT1-001", as: "rest2" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalEtemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 2);

    const playedIds = s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.instanceId);
    expect(playedIds).toContain(s.inst("chuumon").instanceId);
    expect(playedIds).toContain(s.inst("sukamon").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("rest1").instanceId, s.inst("rest2").instanceId]),
    );
  });
});
import { getCardDefinition } from "@aegis/shared";
