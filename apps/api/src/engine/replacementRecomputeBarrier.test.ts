import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/BT20/BT20-093.js";
import "../cards/BT20/BT20-027.js";
import "../cards/BT20/BT20-044.js";
import "../cards/ST2/ST2-16.js";
import "../cards/EX3/EX3-074.js";

describe("continuous replacement recompute barrier", () => {
  it("recomputes BT20-093 before a public non-battle leave and resolves immediate DNA", async () => {
    const options = {
      autoAcceptOptional: false,
      autoDeclineOptional: true,
      autoSelectCards: true,
      preferInstanceIds: [] as string[],
    };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-027", suspended: true, as: "slayer" },
            { card: "BT20-044", as: "breaker" },
          ],
          hand: [
            { card: "BT20-093", as: "option" },
            { card: "EX3-074", as: "examon" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-027", dp: 16000, as: "opponent" }],
          hand: [{ card: "ST2-16", as: "return" }],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      options,
    );
    const optionId = s.inst("option").instanceId;
    const slayerCardId = s.perm("slayer").topCard.instanceId;
    options.preferInstanceIds.push(s.perm("slayer").permanentId, slayerCardId);
    s.state.memory = 10;

    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === optionId));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX3-074")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    options.autoDeclineOptional = false;
    options.autoAcceptOptional = true;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("return").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "EX3-074"));

    const examon = s.state.players[0]!.battleArea.find((perm) => perm.topCard.cardId === "EX3-074");
    expect(examon).toBeDefined();
    expect(examon!.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-027", "BT20-044"]));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === slayerCardId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT20-027")).toBe(false);
    expect(s.state.memory).toBe(-4); // Ordinary 7-memory Option cost from the opponent's 3-memory turn.
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
