import { describe, expect, it } from "vitest";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { observe } from "../../engine/testkit/observe.js";

describe("P-009 Agumon", () => {
  it("gives +2000 DP only to a Greymon-family host during its owner's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-010", as: "greymon", under: ["P-009"] },
          { card: "BT1-018", as: "agumon", under: ["P-009"] },
        ],
      },
    });
    const greymonBase = s.perm("greymon").baseDP;
    const agumonBase = s.perm("agumon").baseDP;
    await s.ready();

    expect(s.perm("greymon").currentDP).toBe(greymonBase + 2000);
    expect(s.perm("agumon").currentDP).toBe(agumonBase);
  });
});

describe("P-009 inherited standardized Greymon name", () => {
  for (const { cardId, cost, dp, survives } of [
    { cardId: "BT7-011", cost: 3, dp: 6000, survives: false },
    { cardId: "P-010", cost: 2, dp: 7000, survives: true },
  ]) {
    it(`publicly evolves to ${cardId} and uses its standardized name in battle`, async () => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "P-009", as: "rookie", under: [{ card: "ST1-01", as: "egg" }] }],
          hand: [{ card: cardId, as: "evolution" }],
          deck: [{ card: "BT1-009", as: "draw" }, "BT1-013"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-037", as: "defender", suspended: true }],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
      });
      s.state.memory = 10;
      await s.ready();
      const host = s.perm("rookie");
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          instanceId: s.inst("evolution").instanceId,
          permanentId: host.permanentId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          host.topCard.instanceId === s.inst("evolution").instanceId &&
          s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("draw").instanceId),
      );
      expect(host.currentDP).toBe(dp);
      expect(host.stack.map((card) => card.instanceId)).toEqual([
        s.inst("egg").instanceId,
        s.inst("rookie").instanceId,
      ]);
      expect(s.state.memory).toBe(10 - cost);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: host.permanentId,
          target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual(
        survives ? [s.inst("evolution").instanceId] : [],
      );
      expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
        (survives
          ? []
          : [s.inst("egg").instanceId, s.inst("rookie").instanceId, s.inst("evolution").instanceId]
        ).sort(),
      );
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("defender").instanceId]);
      expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
    });
  }
});
