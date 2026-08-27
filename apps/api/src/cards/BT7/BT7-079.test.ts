import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-079.js";

describe("BT7-079 Cherubimon", () => {
  it("plays a purple Tamer from trash and deletes one level-4-or-lower Digimon per Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-012", as: "base" },
            { card: "BT7-091", as: "existingTamer" },
          ],
          hand: [{ card: "BT7-079", as: "evolving" }],
          trash: [{ card: "BT7-091", as: "playedTamer" }],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "first" },
            { card: "BT2-047", as: "second" },
            { card: "BT2-047", as: "third" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("playedTamer").instanceId,
      ),
    ).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.perm("existingTamer").topCard.instanceId,
      ),
    ).toBe(true);
  });
});
