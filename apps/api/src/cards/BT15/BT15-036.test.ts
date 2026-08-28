import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-036.js";

describe("BT15-036", () => {
  it("retains Blocker", () =>
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] }));
  it("may trash security to give an opposing Digimon -6000 DP on play or deletion", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "ModifyDP", amount: -6000, duration: "untilOpponentTurnEnd", cost: { kind: "trash" }, optional: true },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "ModifyDP", amount: -6000, cost: { kind: "trash" } }],
    });
  });

  it("On Play can trash the chosen bottom security card before applying -6000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-036", as: "wizardmon" }],
          security: [
            { card: "BT1-001", as: "top" },
            { card: "BT1-002", as: "bottom" },
          ],
        },
        1: { battleArea: [{ card: "BT15-029", as: "target", dp: 8000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wizardmon"));
    await settle(() => s.perm("target").currentDP === 2000);

    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("bottom").instanceId);
  });

  it("On Deletion can trash the chosen top security card from the leaving owner's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-036", as: "wizardmon" }],
          security: [
            { card: "BT1-001", as: "top" },
            { card: "BT1-002", as: "bottom" },
          ],
        },
        1: { battleArea: [{ card: "BT15-029", as: "target", dp: 8000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("wizardmon").permanentId])).toBe(1);
    await settle(() => s.perm("target").currentDP === 2000);

    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("bottom").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("top").instanceId);
  });

  it("does not apply the DP reduction when security cannot pay the cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-036", as: "wizardmon" }] },
        1: { battleArea: [{ card: "BT15-029", as: "target", dp: 8000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wizardmon"));

    expect(s.perm("target").currentDP).toBe(8000);
  });

  it("suspends to block a real opposing player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-036", as: "wizardmon" }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT15-025", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("wizardmon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("wizardmon").isSuspended);

    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
