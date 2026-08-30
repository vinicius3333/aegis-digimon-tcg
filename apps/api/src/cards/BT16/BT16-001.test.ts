import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-001.js";
import "../index.js";
import "../BT1/BT1-036.js";

describe("BT16-001", () => {
  it("once per turn deletes an opposing Digimon at 2000 DP or less when this has two colors", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          target: { filter: { dp: { op: "lte", value: 2000 } } },
          condition: { kind: "selfColorCount", value: 2 },
        },
      ],
    }));

  it("deletes a 2000 DP opponent, but not a 3000 DP opponent, from a multicolor host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-007", as: "host", under: ["BT16-001"] }] },
        1: {
          battleArea: [
            { card: "BT16-007", as: "atLimit", dp: 2000 },
            { card: "BT16-007", as: "aboveLimit", dp: 3000 },
          ],
          security: ["BT16-001"],
        },
      },
      { autoSelectCards: true },
    );

    // Capture both ids before the attack: the deleted permanent is off the board afterwards,
    // so `perm("atLimit")` can no longer resolve it.
    const aboveLimitId = s.perm("aboveLimit").permanentId;
    const atLimitInstanceId = s.perm("atLimit").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveLimitId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === atLimitInstanceId)).toBe(true);
  });

  it("does not activate from a one-color host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-006", as: "host", under: ["BT16-001"] }] },
      1: { battleArea: [{ card: "BT16-007", as: "target", dp: 2000 }], security: ["BT16-001"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("does not delete a second target after a production unsuspend and second attack in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-036", as: "garurumon" }],
          battleArea: [{ card: "BT16-007", as: "host", under: ["BT16-001"] }],
        },
        1: {
          battleArea: [
            { card: "BT16-007", as: "firstTarget", dp: 2000 },
            { card: "BT16-007", as: "secondTarget", dp: 2000 },
          ],
          security: ["BT16-001", "BT16-001"],
        },
      },
      { autoSelectCards: true },
    );
    const secondTargetId = s.perm("secondTarget").permanentId;
    const secondTargetInstanceId = s.perm("secondTarget").topCard.instanceId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").isSuspended === false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondTargetId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === secondTargetInstanceId)).toBe(false);
  });
});
