import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-052.js";

describe("BT18-052 CannonBeemon", () => {
  it("de-digivolves an exact opposing target once per face-up security card and grants Insectoid", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "DeDigivolve", scaling: { unit: "security", filter: { faceUp: true } } }],
    });
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-052", as: "cannon" }],
          security: [
            { card: "BT1-001", faceUp: true },
            { card: "BT1-002", faceUp: true },
            { card: "BT1-003", faceUp: false },
          ],
        },
        1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-030", "BT1-009", "BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 2);

    expect(observe(s.engine).hasEffectiveTrait(s.perm("cannon"), "Insectoid")).toBe(true);
    expect(s.perm("target").topCard?.cardId).toBe("BT1-010");
    expect(s.perm("target").stack).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it.each([
    [true, true],
    [false, false],
  ])("face-up security=%s grants Royal Base Digimon Blocker=%s on the opponent's turn", async (faceUp, expected) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-044", as: "royalBase" }],
        security: [{ card: "BT18-052", as: "securityCannon", faceUp }],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("royalBase"), "Blocker")).toBe(expected);
    assertNoLoudGap(s);
  });

  it("digivolves from a level-4 Royal Base for 3 and scales only from face-up security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-046", as: "base" }],
          hand: [{ card: "BT18-052", as: "cannon" }],
          security: [
            { card: "BT1-001", faceUp: true },
            { card: "BT1-002", faceUp: false },
          ],
          deck: ["BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-030", "BT1-009", "BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cannon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 2);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe("BT18-046");
    expect(s.perm("target").stack).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("trashes only the first top security when its inherited host wins battles in a turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-052"] }] },
        1: {
          battleArea: [
            { card: "BT1-030", as: "first", suspended: true },
            { card: "BT1-030", as: "second", suspended: true },
          ],
          security: [
            { card: "BT1-001", as: "top" },
            { card: "BT1-002", as: "bottom" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("top").instanceId);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
