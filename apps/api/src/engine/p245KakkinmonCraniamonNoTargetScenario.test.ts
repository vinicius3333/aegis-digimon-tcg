import { Phase, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("P-245 Kakkinmon + EX13-062 Craniamon no-target Discord arena scenario", () => {
  it("announces Craniamon's suspend trigger even with no opponent Digimon (Discord 1557481090870939840)", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-p245-kakkinmon-craniamon-no-target", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    const craniamon = human.battleArea[0]!;
    const handBeforeEnd = human.hand.length;
    const eventsBeforeEnd = s.events.length;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(
      () => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined,
    );

    const endOfTurn = s.events.slice(eventsBeforeEnd);
    const indexOf = (match: (event: ServerEvent) => boolean) => endOfTurn.findIndex(match);
    const kakkinmonTriggered = indexOf((event) => event.kind === "effectTriggered" && event.sourceCardId === "P-245");
    const suspended = indexOf(
      (event) =>
        event.kind === "cardsMoved" && event.to === "suspended" && event.instanceIds.includes(craniamon.permanentId),
    );
    const kakkinmonResolved = indexOf((event) => event.kind === "effectResolved" && event.sourceCardId === "P-245");
    const craniamonNoEffect = endOfTurn.filter(
      (event) => event.kind === "effectHadNoEffect" && event.sourceCardId === "EX13-062",
    );
    expect(kakkinmonTriggered).toBeGreaterThanOrEqual(0);
    expect(suspended).toBeGreaterThan(kakkinmonTriggered);
    expect(kakkinmonResolved).toBeGreaterThan(suspended);
    expect(craniamonNoEffect).toEqual([expect.objectContaining({ seat: 0, timing: "whenSuspended" })]);
    expect(endOfTurn.indexOf(craniamonNoEffect[0]!)).toBeGreaterThan(suspended);
    expect(
      endOfTurn.some(
        (event) =>
          event.kind === "effectTriggered" && event.sourceCardId === "EX13-062" && event.timing === "whenSuspended",
      ),
    ).toBe(false);
    expect(human.hand).toHaveLength(handBeforeEnd + 1);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
