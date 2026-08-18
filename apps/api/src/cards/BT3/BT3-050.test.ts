import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-050.js";

describe("BT3-050 Stingmon", () => {
  it("gains 1 memory when its host deletes an opposing Digimon in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-052", dp: 7000, as: "host", under: ["BT3-050"] }] },
      1: { battleArea: [{ card: "BT1-010", dp: 1000, suspended: true, as: "defender" }] },
    });
    s.state.memory = 0;
    const defenderId = s.perm("defender").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === defenderId) &&
        s.state.memory === 1,
      5000,
    );

    expect(s.state.memory).toBe(1);
  });
});
