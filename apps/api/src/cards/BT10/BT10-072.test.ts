import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-072.js";

describe("BT10-072 Soundbirdmon", () => {
  it("places one purple Digimon from hand under the chosen Tamer, then draws exactly 1", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-072", as: "soundbirdmon" },
            { card: "BT10-093", as: "chosenTamer" },
            { card: "BT10-093", as: "otherTamer" },
          ],
          hand: [
            { card: "BT10-071", as: "purpleMaterial" },
            { card: "BT1-009", as: "redDigimon" },
          ],
          deck: [
            { card: "BT1-001", as: "drawn" },
            { card: "BT1-002", as: "notDrawn" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const purpleId = s.inst("purpleMaterial").instanceId;
    const redId = s.inst("redDigimon").instanceId;
    preferred.push(purpleId, s.perm("chosenTamer").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("soundbirdmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("chosenTamer").stack.some(({ instanceId }) => instanceId === purpleId) &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId),
    );

    expect(s.perm("otherTamer").stack.some(({ instanceId }) => instanceId === purpleId)).toBe(false);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === redId)).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not draw when no purple Digimon can pay the attack cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-072", as: "soundbirdmon" },
          { card: "BT10-093", as: "tamer" },
        ],
        hand: [{ card: "BT1-009", as: "redDigimon" }],
        deck: [{ card: "BT1-001", as: "top" }],
      },
      1: { security: ["BT1-001"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("soundbirdmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("tamer").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("uses Save to place itself under one of its Tamers on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-072", as: "soundbirdmon" },
            { card: "BT10-093", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const soundbirdmonId = s.perm("soundbirdmon").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("soundbirdmon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === soundbirdmonId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === soundbirdmonId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("its inherited source gains owner memory only when trashed by an effect on the opponent's turn", async () => {
    const opponentTurn = setupEngine({
      0: {
        battleArea: [{ card: "BT10-075", as: "host", under: [{ card: "BT10-072", as: "source" }] }],
      },
    });
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.memory = 0;
    await advance(opponentTurn.engine).verb.trashDigivolutionCards(
      opponentTurn.perm("host").permanentId,
      [opponentTurn.inst("source").instanceId],
      1,
    );
    await settle(() => opponentTurn.state.memory === -1);
    expect(opponentTurn.state.memory).toBe(-1);

    const ownTurn = setupEngine({
      0: {
        battleArea: [{ card: "BT10-075", as: "host", under: [{ card: "BT10-072", as: "source" }] }],
      },
    });
    ownTurn.state.memory = 0;
    await advance(ownTurn.engine).verb.trashDigivolutionCards(
      ownTurn.perm("host").permanentId,
      [ownTurn.inst("source").instanceId],
      1,
    );
    expect(ownTurn.state.memory).toBe(0);
    assertNoLoudGap(opponentTurn);
    assertNoLoudGap(ownTurn);
  });
});
