import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/BT20/BT20-095.js";
import "../cards/BT20/BT20-010.js";
import "../cards/BT20/BT20-012.js";
import "../cards/BT20/BT20-048.js";
import "../cards/ST1/ST1-16.js";

describe("targeted breeding move cost", () => {
  it.each([true, false])("moves the targeted breeding Digimon before free evolution (accept=%s)", async (accept) => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-009", as: "breedingSource" },
          battleArea: [
            { card: "BT20-048", as: "victim" },
            { card: "BT20-010", as: "otherAlly" },
          ],
          hand: [{ card: "BT20-095", as: "option" }],
          deck: ["BT20-012", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          hand: [{ card: "ST1-16", as: "delete" }],
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      {
        autoAcceptOptional: accept,
        autoDeclineOptional: !accept,
        autoSelectCards: true,
        autoChooseOption: true,
      },
    );
    const victimId = s.perm("victim").topCard.instanceId;
    const otherAllyId = s.perm("otherAlly").topCard.instanceId;
    const optionId = s.inst("option").instanceId;
    const baseId = s.perm("breedingSource").topCard.instanceId;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding || s.state.phase === Phase.Main);
    const skippedBreeding =
      s.state.phase === Phase.Breeding ? s.engine.applyIntent(0, { type: "endPhase" }) : { ok: true };
    expect(skippedBreeding).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT20-012")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 8;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("delete").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === victimId));
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-012") === accept,
    );
    const evolved = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT20-012");
    expect(evolved !== undefined).toBe(accept);
    expect(evolved?.stack.map((card) => card.instanceId) ?? []).toEqual(accept ? [baseId] : []);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === otherAllyId)).toBe(true);
    expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(accept ? undefined : baseId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(accept);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId)).toBe(!accept);
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
