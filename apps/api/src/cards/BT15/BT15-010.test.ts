import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-010.js";

describe("BT15-010", () => {
  it("once per turn deletes an opposing Digimon with 3000 DP or less when your Digimon attacks a player", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          actions: [
            {
              kind: "Delete",
              condition: { kind: "attackTargetsPlayer" },
              target: { filter: { dp: { op: "lte", value: 3000 } } },
            },
          ],
        },
      ],
    }));

  it("deletes exactly one 3000-DP opponent at player-attack declaration and only once that turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-010", as: "akatorimon" },
            { card: "BT1-009", as: "attacker", dp: 5000 },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstSmall", dp: 3000 },
            { card: "BT1-009", as: "secondSmall", dp: 3000 },
            { card: "BT1-009", as: "large", dp: 4000 },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const firstSmallId = s.perm("firstSmall").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstSmallId));
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("secondSmall").permanentId,
      s.perm("large").permanentId,
    ]);
  });

  it("does not delete when an owned Digimon attacks an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-010", as: "akatorimon" },
            { card: "BT1-009", as: "attacker", dp: 1000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").permanentId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
  });
});
