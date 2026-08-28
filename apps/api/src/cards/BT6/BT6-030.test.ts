import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-002.js";
import "./BT6-030.js";

describe("BT6-030 Gabumon - Bond of Friendship", () => {
  it("unsuspends and bottom-decks a level 5 Digimon after trashing all its sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-030", as: "bond" }, "BT1-085"] },
        1: {
          deck: [{ card: "BT1-010", as: "existing" }],
          battleArea: [
            {
              card: "BT3-015",
              under: [
                { card: "BT1-001", as: "source1" },
                { card: "BT1-002", as: "source2" },
              ],
              as: "target",
            },
          ],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bond").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { isAttacking: boolean } }).combat;
    await settle(
      () => s.state.phase === Phase.Main && !combat.isAttacking && s.state.players[1]!.battleArea.length === 0,
      5000,
    );

    expect(s.perm("bond").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bond").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("source1").instanceId, s.inst("source2").instanceId]),
    );
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT3-015");
  });

  it("uses rules cleanup without emitting whenDigivolutionTrashed (Q1399)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-030", under: ["BT6-002"], as: "bond" }],
          deck: [{ card: "BT1-010", as: "notDrawn" }],
        },
        1: {
          deck: [{ card: "BT1-012", as: "sentinel" }],
          battleArea: [{ card: "BT3-015", under: [{ card: "BT1-011", as: "source" }], as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("bond"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bond").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.at(-1)?.instanceId === s.inst("target").instanceId);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
  });
});
