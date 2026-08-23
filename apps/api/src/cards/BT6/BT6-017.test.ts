import type { PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-017.js";

describe("BT6-017 MagnaKidmon", () => {
  it("has Security Attack +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-017", as: "magna" }] } });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("magna"), "SecurityAttack")).toBe(1);
  });

  it("uses a cost-7 Option from hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "base" }],
          hand: [
            { card: "BT6-017", as: "evolving" },
            { card: "BT6-095", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => player.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.memory).toBe(0);
  });

  it("deletes a 4000 DP opposing Digimon when the Option branch is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "base" }],
          hand: [
            { card: "BT6-017", as: "evolving" },
            { card: "BT6-095", as: "option" },
          ],
        },
        1: { battleArea: [{ card: "BT5-071", as: "target", dp: 4000 }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]?.battleArea.some((permanent) => permanent.permanentId === targetId) === false,
    );

    expect(s.state.players[0]?.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
