import { EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-072.js";
import "./BT1-094.js";
describe("BT1-094 Oblivion Bird", () => {
  it("deletes only an opposing Digimon with Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-072", as: "ownBlocker" }, "BT1-010"],
          hand: [{ card: "BT1-094", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-072", as: "opposingBlocker" },
            { card: "BT1-071", as: "nonBlocker" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const opposingBlockerId = s.perm("opposingBlocker").permanentId;
    const nonBlockerId = s.perm("nonBlocker").permanentId;
    const ownBlockerId = s.perm("ownBlocker").permanentId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((entry) => entry.permanentId === opposingBlockerId));

    expect(s.state.players[1]!.battleArea.some((entry) => entry.permanentId === nonBlockerId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((entry) => entry.permanentId === ownBlockerId)).toBe(true);
  });

  it("deletes a Digimon that received Blocker from an Option effect (Q962)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-010"], hand: [{ card: "BT1-094", as: "oblivionBird" }] },
        1: { battleArea: [{ card: "BT1-071", as: "grantedBlocker", suspended: true }] },
      },
      { autoSelectCards: true },
    );

    const grantedBlockerId = s.perm("grantedBlocker").permanentId;
    advance(s.engine).ledgers.continuous.addKeywordGrant(grantedBlockerId, "Blocker", EffectDuration.UntilEachTurnEnd);
    expect(observe(s.engine).hasKeyword(grantedBlockerId, "Blocker")).toBe(true);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("oblivionBird").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((entry) => entry.permanentId === grantedBlockerId) &&
        s.state.players[1]!.trash.some((card) => card.cardId === "BT1-071"),
    );

    expect(s.state.players[1]!.battleArea.some((entry) => entry.permanentId === grantedBlockerId)).toBe(false);
  });

  it("resolves without a target decision when the opponent controls no Digimon with Blocker", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT1-010"], hand: [{ card: "BT1-094", as: "option" }] },
      1: { battleArea: ["BT1-071"] },
    });
    const optionId = s.inst("option").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT1-094", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT1-072", as: "blocker" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
