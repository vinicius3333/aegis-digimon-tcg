import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST20-05.js";

describe("ST20-05 Gatomon", () => {
  it("gives exactly two opposing Digimon Security Attack -1 until their turn ends", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST20-05", as: "gatomon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "outside" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack") === -1);
    expect(observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("second"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("outside"), "SecurityAttack")).toBe(0);
  });

  it("applies the inherited -2000 DP attack debuff once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["ST20-05"] }] },
      1: { battleArea: [{ card: "BT1-013", as: "target" }], security: [{ card: "ST20-14", as: "security" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(
      s.state.players[1]!.battleArea.find((perm) => perm.permanentId === s.perm("target").permanentId)?.currentDP,
    ).toBe(3000);
  });
});
