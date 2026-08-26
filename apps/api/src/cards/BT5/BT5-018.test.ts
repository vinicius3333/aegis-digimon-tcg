import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-018.js";

describe("BT5-018 Dorbickmon", () => {
  it("trashes a red Digimon and adds its DP for the turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT5-018", as: "dorbickmon" }], hand: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.perm("dorbickmon").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dorbickmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dorbickmon").currentDP === before + 3000);
    expect(s.perm("dorbickmon").currentDP).toBe(before + 3000);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("Q1294 accumulates DP from separate attacks in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-018", as: "dorbickmon" }],
          hand: [{ card: "BT1-009", as: "first" }, { card: "BT5-007", as: "second" }],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.perm("dorbickmon").currentDP;
    for (const expected of [before + 3000, before + 5000]) {
      expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("dorbickmon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
      await settle(() => s.perm("dorbickmon").currentDP === expected);
      if (expected !== before + 5000) await advance(s.engine).verb.unsuspend([s.perm("dorbickmon").permanentId]);
    }
    expect(s.perm("dorbickmon").currentDP).toBe(before + 5000);
  });
});
