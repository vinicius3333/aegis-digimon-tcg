import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT25-068.js";

const CARD_ID = "BT25-068";

describe("BT25-068 Deltamon", () => {
  it("alternate-digivolves from an off-color level 3 TS card for 2 and grants Collision", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "tsBase" }],
        hand: [{ card: CARD_ID, as: "delta" }],
        deck: ["BT1-001"],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsBase").permanentId,
        instanceId: legal.inst("delta").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsBase").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);
    expect(observe(legal.engine).hasKeyword(legal.perm("tsBase"), "Collision")).toBe(true);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "plain" }], hand: [{ card: CARD_ID, as: "delta" }] },
    });
    invalid.state.memory = 2;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plain").permanentId,
        instanceId: invalid.inst("delta").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("reacts only to this Deltamon suspending and consumes one physical OPT", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "delta" },
          { card: "BT1-013", as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "BT25-073", as: "target", under: ["BT24-009", "BT24-011"] }] },
    });
    await s.ready();
    expect(observe(s.engine).subscriptions("whenSuspended", s.perm("delta").permanentId)).toHaveLength(1);
    const fx = (s.engine as unknown as { primitives: { suspend(ids: string[]): Promise<string[]> } }).primitives;
    const targetId = s.perm("target").permanentId;
    const target = () => s.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === targetId)!;
    const before = target().stack.length;

    await fx.suspend([s.perm("ally").permanentId]);
    expect(target().stack).toHaveLength(before);

    await fx.suspend([s.perm("delta").permanentId]);
    await settle(() => target().stack.length === before - 1);
    expect(target().stack).toHaveLength(before - 1);

    s.perm("delta").isSuspended = false;
    await fx.suspend([s.perm("delta").permanentId]);
    await settle(() => false, 100);
    expect(target().stack).toHaveLength(before - 1);
  });

  it("gives separate copies independent OPT budgets", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "first" },
          { card: CARD_ID, as: "second" },
        ],
      },
      1: { battleArea: [{ card: "BT25-073", as: "target", under: ["BT24-009", "BT24-011"] }] },
    });
    await s.ready();
    expect(observe(s.engine).subscriptions("whenSuspended", s.perm("first").permanentId)).toHaveLength(1);
    expect(observe(s.engine).subscriptions("whenSuspended", s.perm("second").permanentId)).toHaveLength(1);
    const fx = (s.engine as unknown as { primitives: { suspend(ids: string[]): Promise<string[]> } }).primitives;
    const targetId = s.perm("target").permanentId;
    const target = () => s.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === targetId)!;
    const before = target().stack.length;
    await fx.suspend([s.perm("first").permanentId]);
    await settle(() => target().stack.length === before - 1);
    expect(target().stack).toHaveLength(before - 1);
    await fx.suspend([s.perm("second").permanentId]);
    await settle(() => target().stack.length === before - 2);
    expect(target().stack).toHaveLength(before - 2);
  });

  it("grants inherited +1000 DP only while Deltamon is under a host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-013", dp: 4000, as: "host", under: [CARD_ID] },
          { card: CARD_ID, dp: 4000, as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("standalone").currentDP).toBe(4000);
  });
});
