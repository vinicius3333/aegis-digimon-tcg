import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-098.js";

describe("BT3-098 Plasma Stake", () => {
  it("deletes an opposing Digimon at 13000 DP or more", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT3-007"], hand: [{ card: "BT3-098", as: "option" }] },
        1: { battleArea: [{ card: "BT3-019", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not delete an opposing Digimon below 13000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT3-007"], hand: [{ card: "BT3-098", as: "option" }] },
        1: { battleArea: [{ card: "BT3-019", dp: 12_999, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-098"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(12_999);
  });

  it("activates its Main deletion effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT3-098", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT3-019", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
