import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-003.js";

describe("BT15-003", () => {
  it("may trash the top or bottom security card to gain 1 memory once per turn", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      optional: true,
      cost: { kind: "trash", target: { count: 1, filter: { zone: "security" } } },
    });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      abortOnDecline: true,
      cost: {
        raw: "By trashing the top or bottom card of your security stack",
        target: { filter: { controller: "mine" } },
      },
    });
  });

  it("trashes one security card and gains exactly 1 memory on its first attack each turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-033", as: "attacker", dp: 8000, under: ["BT15-003"] }],
          security: [
            { card: "BT1-002", as: "top" },
            { card: "BT1-001", as: "bottom" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }],
          security: [{ card: "BT1-001", as: "opponentSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.length === 1 &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.memory === 1,
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("can choose the bottom security card through the public attack cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-033", as: "attacker", under: ["BT15-003"] }],
          security: [
            { card: "BT1-002", as: "top" },
            { card: "BT1-001", as: "bottom" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("bottom").instanceId)).toBe(true);
  });

  it("may decline without trashing security or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-033", as: "attacker", under: ["BT15-003"] }],
          security: [{ card: "BT1-001", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }] },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
