import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-073.js";
import "./BT10-075.js";
import "./BT10-076.js";
import "./BT10-077.js";
import "./BT10-093.js";

describe("BT10 Bagra Army inherited-source package", () => {
  it("resolves each different inherited memory effect when the stack is trashed together", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-075",
              as: "damemon",
              under: [
                { card: "BT10-073", as: "chuuChuumon" },
                { card: "BT10-076", as: "troopmon" },
                { card: "BT10-077", as: "madLeomon" },
              ],
            },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("damemon").permanentId,
      [s.inst("chuuChuumon").instanceId, s.inst("troopmon").instanceId, s.inst("madLeomon").instanceId],
      1,
    );
    await settle(() => s.state.memory === -3);

    expect(s.state.memory).toBe(-3);
    expect(s.perm("damemon").stack).toHaveLength(0);
  });

  it("stacks Troopmon's reaction with its inherited source, then Saves under Yuu on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-093", as: "yuu" },
            {
              card: "BT10-076",
              as: "troopmon",
              under: [{ card: "BT10-073", as: "chuuChuumon" }],
            },
          ],
          deck: [{ card: "BT1-001", as: "yuuDraw" }],
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentDigimon" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
      },
    );
    const troopmonId = s.perm("troopmon").permanentId;
    const troopmonInstanceId = s.perm("troopmon").topCard.instanceId;
    const chuuChuumonId = s.inst("chuuChuumon").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: s.inst("opponentDigimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === 6 && s.state.players[0]!.trash.some((card) => card.instanceId === chuuChuumonId),
    );

    // Opponent pays 2, then Troopmon and ChuuChuumon each gain 1 for us: 10 - 2 - 1 - 1.
    expect(s.state.memory).toBe(6);
    expect(s.perm("troopmon").stack).toHaveLength(0);

    await advance(s.engine).verb.deletePermanent([troopmonId], "byEffect");
    await settle(() => s.perm("yuu").stack.some((card) => card.instanceId === troopmonInstanceId));

    expect(s.perm("yuu").stack.some((card) => card.instanceId === troopmonInstanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yuuDraw").instanceId)).toBe(true);
    // Saving Troopmon under Yuu places a purple card under that Tamer, so
    // Yuu's all-turns trigger supplies the final memory gain.
    await settle(() => s.state.memory === 5);
    expect(s.state.memory).toBe(5);
  });
});
