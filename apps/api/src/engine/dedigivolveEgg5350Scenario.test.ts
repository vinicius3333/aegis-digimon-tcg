import { Phase, type ServerEvent } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("GitHub #5350: playable arena trashes the reported exposed Assembly egg by rule after BlitzGreymon resolves", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoChooseOption: true });
  layDevScenario("arena-github-5350-dedigivolve-egg", s.state, [BLUE_DECK, RED_DECK]);
  const victim = s.state.players[1]!.battleArea[0]!;
  const eggId = victim.stack.find((card) => card.cardId === "BT26-001")!.instanceId;
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const blitz = s.state.players[0]!.hand.find((card) => card.cardId === "AD1-009")!;
    const base = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT1-021")!;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: blitz.instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);
    expect(
      s.events
        .filter(
          (event): event is Extract<ServerEvent, { kind: "cardsMoved" }> =>
            event.kind === "cardsMoved" && event.strippedStackTops?.reason === "deDigivolve",
        )
        .flatMap((event) => event.cardIds ?? []),
    ).toEqual(["BT26-060", "BT26-085"]);
    const cleanup = s.events.find(
      (event) => event.kind === "cardsMoved" && event.to === "trash" && event.instanceIds.includes(eggId),
    );
    expect(cleanup).toBeDefined();
    expect(cleanup?.kind === "cardsMoved" && cleanup.deletedPermanents).toBeUndefined();
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([
      "BT26-060",
      "BT26-085",
      "BT26-016",
      "BT26-015",
      "BT26-011",
      "BT26-009",
      "BT26-001",
    ]);
  } finally {
    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  }
});
