import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-062.js";
describe("BT4-062 Nidhoggmon", () => {
  it("Digi-Bursts 4 to bottom-deck all suspended opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-011", under: ["BT1-010", "BT1-011", "BT1-012"], as: "base" }],
          hand: [{ card: "BT4-062", as: "evolving" }],
        },
        1: {
          deck: ["BT1-013"],
          battleArea: [
            { card: "BT2-024", as: "low" },
            { card: "BT3-017", as: "already", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const opp = s.state.players[1] as PlayerState;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opp.battleArea.length === 0);
    expect(opp.deck).toHaveLength(3);
    expect(s.perm("base").stack).toHaveLength(0);
  });
});
