import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-066.js";

describe("P-066 Huckmon", () => {
  it("deletes a 4000 DP-or-less Digimon and always adds itself to hand", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { security: [{ card: "P-066", as: "huckmon" }] },
        1: {
          battleArea: [
            { card: "BT1-025", as: "attacker" },
            { card: "BT1-009", as: "victim" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").permanentId);
    const huckmonId = s.inst("huckmon").instanceId;
    const victimId = s.perm("victim").permanentId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === huckmonId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === huckmonId)).toBe(true);
  });

  it("draws 1 when nothing is deleted, then still adds itself to hand", async () => {
    const s = setupEngine({
      0: {
        deck: [{ card: "BT1-009", as: "drawn" }],
        security: [{ card: "P-066", as: "huckmon" }],
      },
      1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
    });
    const huckmonId = s.inst("huckmon").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([huckmonId, drawnId]),
    );
  });
});

describe("P-066 Huckmon — KB Q&A rulings", () => {
  async function checkHuckmon(opponentField: { card: string; as: string; dp?: number }[]) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { deck: [{ card: "BT1-009", as: "drawn" }], security: [{ card: "P-066", as: "huckmon" }] },
        1: { battleArea: [{ card: "BT1-025", as: "attacker" }, ...opponentField] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    for (const { as } of opponentField) preferred.push(s.perm(as).permanentId);
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("huckmon").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    return s;
  }

  it("still adds itself to hand when no opposing Digimon with 4000 DP or less is deleted (Q4170)", async () => {
    const s = await checkHuckmon([{ card: "BT1-009", as: "large", dp: 5000 }]);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(s.perm("large").permanentId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("huckmon").instanceId, s.inst("drawn").instanceId].sort(),
    );
  });

  it("adds itself to hand after 'then' even when a deletion means the ＜Draw 1＞ condition isn't met (Q4845)", async () => {
    const s = await checkHuckmon([{ card: "BT1-009", as: "victim" }]);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("huckmon").instanceId]);
  });
});
