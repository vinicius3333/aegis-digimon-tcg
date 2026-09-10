import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

/**
 * A breeding-phase move resolves its "when one of your Digimon moves from the breeding area"
 * watchers INSIDE the breeding phase. The turn only advances to Main — and fires
 * [Start of Your Main Phase] — after those watchers have settled (Comprehensive Rules §6-4:
 * the breeding phase ends once its action and every effect it triggered have resolved).
 *
 * Vehicle — BT16-082 Ukkomon ([Your Turn][Once Per Turn] when one of your Digimon moves from
 * breeding: reveal 3, add 1 Digimon/Tamer, you may hatch) next to BT19-088 Ai & Mako
 * ([Start of Your Main Phase] if your opponent has a Digimon, gain 1 memory).
 *
 * FAILS-WHEN-REVERTED: close the breeding window synchronously in `handleMoveFromBreeding`
 * before the move's trigger chain settles => the turn machine enters Main and fires the
 * start-of-main window while Ukkomon's reveal is still resolving, so the hand-add lands in
 * Phase.Main instead of Phase.Breeding.
 */
describe("breeding move trigger ordering", () => {
  it("settles the move's watchers before Main opens and its start-of-main effects fire", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-082", as: "ukko" },
            { card: "BT19-088", as: "tamer" },
          ],
          breeding: { card: "BT1-009", as: "moved" },
          hand: [],
          deck: ["BT1-010", "BT16-090", "BT1-009", "BT1-090", "BT1-010"],
          eggDeck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-010"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    const handAfterDraw = s.state.players[0]!.hand.length;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("moved").permanentId })).toEqual({
      ok: true,
    });

    // Read the phase in the same tick the hand grows: `settle` keeps draining after its
    // predicate holds, and the window closes a few microtasks later once the chain settles.
    let phaseWhenHandGrew: Phase | undefined;
    let memoryWhenHandGrew: number | undefined;
    await settle(() => {
      if (s.state.players[0]!.hand.length !== handAfterDraw + 1) return false;
      phaseWhenHandGrew = s.state.phase;
      memoryWhenHandGrew = s.state.memory;
      return true;
    });
    expect(phaseWhenHandGrew).toBe(Phase.Breeding);
    expect(memoryWhenHandGrew).toBe(3);

    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand).toHaveLength(handAfterDraw + 1);
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT1-001");
    expect(s.state.memory).toBe(4);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("keeps the breeding phase open while a move watcher waits on a decision", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-082", as: "ukko" }],
          breeding: { card: "BT1-009", as: "moved" },
          deck: ["BT1-010", "BT16-090", "BT1-009", "BT1-090", "BT1-010"],
          eggDeck: ["BT1-001"],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("moved").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    expect(s.state.phase).toBe(Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: false, reason: "decision-pending" });

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
