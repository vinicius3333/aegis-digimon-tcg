import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT26 Rosemon Option digivolve lock Discord arena scenario", () => {
  it("Discord 1555363063300096090: a Digimon suspended by attacking can't take the Titan inherited digivolve", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: [
          "dev-perm-1-rosemon-lock-first",
          "dev-perm-1-rosemon-lock-second",
          "dev-rosemon-trash-cost",
          "dev-rosemon-skullbaluchimon",
        ],
      },
    );
    layDevScenario("arena-bt26-rosemon-option-digivolve-lock", s.state, [BLUE_DECK, RED_DECK]);
    const hyogamon = () =>
      s.state.players[1]!.battleArea.find(({ permanentId }) => permanentId === "dev-perm-1-rosemon-hyogamon")!;
    const lockedIds = ["dev-perm-1-rosemon-lock-first", "dev-perm-1-rosemon-lock-second"];
    const locked = () => s.state.players[1]!.battleArea.filter(({ permanentId }) => lockedIds.includes(permanentId));

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-rosemon-option", useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === "dev-rosemon-option") &&
        s.state.pendingDecision === undefined,
    );
    expect(locked().every(({ isSuspended }) => isSuspended)).toBe(true);
    expect(hyogamon().isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(locked().every(({ isSuspended }) => isSuspended)).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: "dev-perm-1-rosemon-hyogamon",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === "dev-rosemon-trash-cost") &&
        s.state.players[0]!.security.length === 4 &&
        s.state.pendingDecision === undefined,
    );
    const hyogamonTop = hyogamon().topCard.cardId;
    const skullBaluchimonInTrash = s.state.players[1]!.trash.some(
      ({ instanceId }) => instanceId === "dev-rosemon-skullbaluchimon",
    );

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(hyogamon().isSuspended).toBe(true);
    expect(hyogamonTop).toBe("BT24-026");
    expect(skullBaluchimonInTrash).toBe(true);
  });
});
