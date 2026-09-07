import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "./testkit/harness.js";

/**
 * KB Q5564 / Q5566 / Q5568 (docs/audits/BT23-reaudit/END-TURN-ORDERING-MECHANISM.md): end-of-turn
 * PENDING PROCESSING left over from an already-resolved effect is not an activated effect, so
 * Comprehensive Rules §15-4-3-5's turn-player-then-non-turn-player split does not apply to it.
 * The TURN PLAYER orders the whole simultaneous set it lands in, whoever controls its source.
 *
 * The engine expresses that as `SubTriggerInstall.orderedByTurnPlayer`, which
 * `GameEngine.subTriggerAsCollected` / `runSubTriggersInChosenOrder` project onto
 * `CollectedEffect.orderingSeat`. Engine lane 5 set the flag at three further sites without
 * behavioural proof; this file supplies it.
 *
 * The decisive shape is two-seat: seat 1 is the turn player and controls a printed
 * [End of Your Turn] effect (EX9-033 Kaguyamon), while seat 0 owns the pending processing, so
 * only the flag makes seat 1 — rather than seat 0 — the seat that is asked for the order. Just
 * one of the three sites can reach that board with a printed card; the other two are bounded to
 * their own owner's turn end, and each case says which it is and why.
 */
describe("end-of-turn pending processing is ordered by the turn player", () => {
  /** Seat 1's printed [End of Your Turn] effect, the other half of every simultaneous set here. */
  const turnPlayerSeat1 = {
    battleArea: [{ card: "EX9-033", as: "kaguyamon" }],
    trash: ["EX9-027"],
    security: ["BT1-009"],
    deck: Array(12).fill("BT1-011"),
  };

  const orderTriggersKeys = (payloadJson: string): string[] =>
    (JSON.parse(payloadJson) as { triggerKeys?: string[] }).triggerKeys ?? [];

  // Site: `interpreter/actions/controlFlow.ts` `DelayedEffect`. BT17-025 Cerberusmon: Werewolf
  // Mode plays a level 3 from the trash on digivolution and arms "return it at the end of your
  // opponent's turn" — pending processing owned by seat 0 that lands in seat 1's turn end.
  it("asks the turn player to order a DelayedEffect armed by the opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-083", as: "cerberusmon" }],
          trash: [{ card: "BT1-029", as: "revived" }],
          hand: [{ card: "BT17-025", as: "werewolf" }],
          deck: Array(12).fill("BT1-010"),
        },
        1: turnPlayerSeat1,
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.memory = 1;
    await s.ready();
    const revivedId = s.inst("revived").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cerberusmon").permanentId,
        instanceId: s.inst("werewolf").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === revivedId));

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const turn = advance(s.engine).runTurn(1);
    await settleAcrossTimers(() => s.state.pendingDecision?.kind === "orderTriggers");

    const pending = s.state.pendingDecision;
    expect(pending?.kind).toBe("orderTriggers");
    // The endpoint: the TURN player is asked, although the delayed return is seat 0's.
    expect(pending?.seat).toBe(1);
    expect(orderTriggersKeys(pending!.payloadJson)).toHaveLength(2);

    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: pending!.decisionId,
        response: { kind: "orderTriggers", order: orderTriggersKeys(pending!.payloadJson).slice(0, 1) },
      }),
    ).toEqual({ ok: true });
    await turn;
  });

  // Site: `primitives.delayedGainMemory` ("at the end of the turn, gain/lose N memory").
  // Unlike the other three sites this one can never be cross-controller: the watcher carries
  // `expiresOnTurnEndOf: seat`, so it fires only at its OWN owner's turn end, where the turn
  // player and the source owner are the same seat. `orderedByTurnPlayer` is therefore correct
  // but inert here, and no board can distinguish the two orderings. What is assertable is that
  // the tail is installed as turn-player-ordered pending processing rather than as its
  // controller's activated effect.
  it("installs a delayed memory change as turn-player-ordered pending processing", async () => {
    const s = setupEngine({ 0: { deck: Array(12).fill("BT1-010") }, 1: { deck: Array(12).fill("BT1-011") } });
    await s.ready();
    const before = advance(s.engine).ledgers.subTriggers.subscriptionsFor("endOfTurn").length;
    advance(s.engine).verb.delayedGainMemory(0, -3);

    const installed = advance(s.engine).ledgers.subTriggers.subscriptionsFor("endOfTurn").slice(before);
    expect(installed).toHaveLength(1);
    expect(installed[0]!.orderedByTurnPlayer).toBe(true);
    expect(installed[0]!.expiresOnTurnEndOf).toBe(0);
  });

  // Site: `interpreter/actions/resources.ts`, the cost-modifier `onConsume` tail. BT5-109 Mega
  // Digimon Fusion! is the only printer, it is a [Main] Option, and its tail says "at the end of
  // THE turn" — the turn it was used on, which is always its own controller's. A cross-controller
  // board is unreachable through any legal line, so the proof here is that the tail is installed
  // as turn-player-ordered pending processing rather than as its controller's activated effect.
  it("installs the consumed cost-reduction tail as turn-player-ordered pending processing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-019", as: "base", under: [{ card: "BT5-014", as: "source" }] },
            { card: "BT5-016", as: "other", under: [{ card: "BT5-014", as: "otherSource" }] },
            "BT5-086",
          ],
          hand: [
            { card: "BT5-109", as: "option" },
            { card: "BT5-086", as: "level7" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT5-019", as: "opponent", under: [{ card: "BT5-014", as: "opponentSource" }] }],
          deck: ["BT5-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const basePermanentId = s.perm("base").permanentId;
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("option").instanceId));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: basePermanentId,
        instanceId: s.inst("level7").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("base").topCard.instanceId === s.inst("level7").instanceId && s.state.pendingDecision === undefined,
    );

    const tails = advance(s.engine)
      .ledgers.subTriggers.subscriptionsFor("endOfTurn")
      .filter(({ sourcePermanentId }) => sourcePermanentId === basePermanentId);
    expect(tails).toHaveLength(1);
    expect(tails[0]!.orderedByTurnPlayer).toBe(true);
  });
});
