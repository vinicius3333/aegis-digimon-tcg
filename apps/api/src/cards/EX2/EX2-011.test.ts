import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-011.js";

describe("EX2-011 Gallantmon", () => {
  it("gets +2000 DP during its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-011", as: "gallantmon" }] } });
    await s.ready();
    expect(s.perm("gallantmon").currentDP).toBe(14000);
  });

  it("deletes a combination totaling at most 6000 DP without a red Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-011", as: "gallantmon" }] },
        1: {
          battleArea: [
            { card: "EX2-031", as: "guardromon" },
            { card: "EX2-015", as: "seasarmon" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallantmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("seasarmon").permanentId);
  });

  it("raises its aggregate deletion budget to 8000 DP with a red Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-011", as: "gallantmon" },
            { card: "EX2-056", as: "takato" },
          ],
        },
        1: {
          battleArea: [
            { card: "EX2-031", as: "guardromon" },
            { card: "EX2-009", dp: 4000, as: "growlmon" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallantmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
