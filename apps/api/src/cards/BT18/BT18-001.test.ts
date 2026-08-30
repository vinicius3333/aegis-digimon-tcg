import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-001.js";

describe("BT18-001 DemiMeramon", () => {
  it("deletes an opposing Digimon at 3000 DP or less when its host attacks with a red Tamer", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } } },
          condition: { kind: "youHave", filter: { kind: ["Tamer"], colors: ["Red"] } },
        },
      ],
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT6-016",
              as: "host",
              under: ["BT18-001", "BT18-008", "BT4-010", "BT6-015"],
            },
            { card: "BT6-084", as: "sistermon" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
        1: {
          security: ["BT1-001", "BT1-001"],
          battleArea: [
            { card: "BT1-030", dp: 3000, as: "small" },
            { card: "BT1-030", dp: 3000, as: "secondSmall" },
            { card: "BT1-030", dp: 4000, as: "large" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const smallId = s.perm("small").permanentId;
    const secondSmallId = s.perm("secondSmall").permanentId;
    const largeId = s.perm("large").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === smallId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === smallId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondSmallId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === largeId)).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondSmallId)).toBe(true);
  });

  it("does not delete without a red Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-008", as: "host", under: ["BT18-001"] }] },
        1: { battleArea: [{ card: "BT1-030", dp: 3000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
  });
});
