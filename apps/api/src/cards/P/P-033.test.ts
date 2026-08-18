import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT2/BT2-105.js";
import "./P-033.js";

describe("P-033 Sunarizamon", () => {
  it("gives Piercing to all own black Digimon at 13000 DP or more", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-033", as: "sunarizamon" },
          { card: "EX1-073", as: "largeBlack", dp: 13_000 },
          { card: "BT2-047", as: "smallBlack", dp: 12_000 },
        ],
      },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("largeBlack"), "Piercing")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("smallBlack"), "Piercing")).toBe(false);
  });

  it("grants Security Attack +1 while inherited by a 13000 DP black Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-073", as: "host", dp: 13_000, under: ["P-033"] }],
      },
    });
    await s.ready();
    await settle(() => observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 1);

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("stops extra checks when the first security card de-digivolves its host below 13000 DP (Q4147)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX1-073",
              as: "attacker",
              dp: 13_000,
              under: ["P-033", "BT2-064"],
            },
          ],
        },
        1: {
          security: [
            { card: "BT2-105", as: "deDigivolveSecurity" },
            { card: "BT1-001", as: "remainingSecurity" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const remainingId = s.inst("remainingSecurity").instanceId;
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => false, 200);

    expect(s.perm("attacker").topCard.cardId).toBe("BT2-064");
    expect(s.perm("attacker").currentDP).toBe(12_000);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([remainingId]);
  });
});
