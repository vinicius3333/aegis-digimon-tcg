import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-042.js";

describe("BT9-042 Raijinmon", () => {
  it("trashes a Machine or Cyborg to give an opposing Digimon -4000 DP when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-060", as: "base" }],
          hand: [{ card: "BT9-042", as: "evolving" }, { card: "BT1-021", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 2000);

    expect(s.state.players[0]!.trash.some(card => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(2000);
  });
});
