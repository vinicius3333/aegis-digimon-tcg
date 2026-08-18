import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-073.js";

describe("BT10-073 ChuuChuumon", () => {
  it("adds a Bagra Army Digimon and Yuu Amano from four revealed cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT10-073", as: "source" }], deck: [
      { card: "BT10-075", as: "digimon" }, { card: "BT10-093", as: "yuu" }, "BT10-071", "BT10-072",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some(c => c.instanceId === s.inst("digimon").instanceId));
    expect(player.hand.some(c => c.instanceId === s.inst("yuu").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(2);
  });

  it("uses Save to place itself under Yuu Amano on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-073", as: "chuuChuumon" },
            { card: "BT10-093", as: "yuu" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const chuuChuumonId = s.perm("chuuChuumon").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([
      s.perm("chuuChuumon").permanentId,
    ])).toBe(1);
    await settle(() => s.perm("yuu").stack.some((card) => card.instanceId === chuuChuumonId));

    expect(s.perm("yuu").stack.some((card) => card.instanceId === chuuChuumonId)).toBe(true);
  });

  it("its inherited effect credits its owner when the source is trashed on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{
          card: "BT10-075",
          as: "damemon",
          under: [{ card: "BT10-073", as: "chuuChuumon" }],
        }],
      },
    }, { autoOrderTriggers: true });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("damemon").permanentId,
      [s.inst("chuuChuumon").instanceId],
      1,
    );
    await settle(() => s.state.memory !== 0);

    // Memory is signed from the turn player's perspective, so seat 0 gaining 1
    // during seat 1's turn produces -1.
    expect(s.state.memory).toBe(-1);
  });
});
