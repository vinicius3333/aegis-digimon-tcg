import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("ST17-13 Magnamon vs EX13-077 Merciful Mode arena scenario", () => {
  it("issue #4905: replays match d20f9c5d, trashes all six sources, then returns Merciful to hand", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-st17-magnamon-merciful-colors", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const merciful = s.state.players[1]!.battleArea[0]!;
    const mercifulInstanceId = merciful.topCard.instanceId;
    const sourceIds = merciful.stack.map((card) => card.instanceId);
    expect(new Set(observe(s.engine).effectiveColors(merciful))).toEqual(
      new Set(["White", "Red", "Blue", "Black", "Green", "Yellow"]),
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-magnamon-colors-veemon" })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-117"));
    await advance(s.engine).waitForMainPhase(0);
    const veemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "P-117")!;
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: veemon.permanentId,
        instanceId: "dev-magnamon-colors-magnamon",
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.hand.some((card) => card.instanceId === mercifulInstanceId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(sourceIds.toReversed());
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([mercifulInstanceId]);
    const trashed = s.events.find(
      (event) => event.kind === "cardsMoved" && event.trashedSources?.sourceCardId === "ST17-13",
    );
    expect(trashed).toMatchObject({ kind: "cardsMoved", to: "trash", instanceIds: sourceIds.toReversed() });
    expect(veemon.topCard.cardId).toBe("ST17-13");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
