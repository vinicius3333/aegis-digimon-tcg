import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("BT23 Examon opponent-turn DNA arena scenario", () => {
  it("Discord 1555244967428100348 DNA digivolves Examon in the opponent's turn without offering its attack", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-bt23-examon-opponent-turn-dna", s.state, [BLUE_DECK, RED_DECK]);
    const securityBefore = s.state.players[1]!.security.length;
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 7;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: "dev-examon-bounce" })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT23-047") &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "ST2-16") &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );

    const examon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT23-047")!;
    expect(examon.isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT20-093");
    expect(s.state.players[1]!.battleArea[0]!.isSuspended).toBe(true);
    expect(s.state.turnSeat).toBe(1);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toEqual([]);
    expect(s.decisions.filter(({ req }) => /^attack/.test(String(req.options?.selectionContext ?? "")))).toEqual([]);
    expect(s.state.players[1]!.security).toHaveLength(securityBefore);

    const geneInstanceId = s.state.players[0]!.trash.find(({ cardId }) => cardId === "BT20-093")!.instanceId;
    const geneMoves = s.events.filter(
      (event) => event.kind === "cardsMoved" && event.to === "trash" && event.instanceIds.includes(geneInstanceId),
    );
    expect(geneMoves).toHaveLength(1);
    expect(geneMoves[0]).not.toHaveProperty("deletedPermanents");
  });
});
