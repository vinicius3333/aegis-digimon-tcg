import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-006.js";
import "../index.js";

describe("BT16-006", () => {
  it("gains 1 memory on deletion by trashing a hand card", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "GainMemory", amount: 1, cost: { kind: "trash" }, optional: false }],
    }));

  it("trashes exactly one hand card and gains memory when its host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-007", as: "host", under: ["BT16-006"], suspended: true }],
          hand: [{ card: "BT1-009", as: "costCard" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 3000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    const hostInstanceId = s.perm("host").topCard.instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("costCard").instanceId));

    expect(s.state.memory).toBe(-1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === hostInstanceId)).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => card.instanceId === s.inst("costCard").instanceId)).toHaveLength(
      1,
    );
  });

  it("does not gain memory when the natural deletion has no hand card to pay the cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-007", as: "host", under: ["BT16-006"], suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 3000 }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
  });
});
