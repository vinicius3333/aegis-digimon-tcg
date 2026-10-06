import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const yoshinos = ["paying", "second", "third"].map((suffix) => `dev-perm-0-yoshino-stack-${suffix}`);

describe("BT26 Yoshino trigger stack Discord arena scenario", () => {
  it("triggers each Yoshino once per event (Discord 1555741214014447737)", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: [
          "dev-perm-1-yoshino-stack-first",
          "dev-perm-0-yoshino-stack-paying",
          "dev-perm-1-yoshino-stack-second",
          "dev-perm-1-yoshino-stack-third",
        ],
        declinePrompts: ["Place 1 card(s) from hand"],
      },
    );
    layDevScenario("arena-bt26-yoshino-trigger-stack", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const bot = s.state.players[1]!;

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-yoshino-stack-geogreymon",
        instanceId: "dev-yoshino-stack-lilamon",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea.find(({ permanentId }) => permanentId === "dev-perm-0-yoshino-stack-geogreymon")?.topCard
          .cardId === "ST24-11" &&
        bot.battleArea.every(({ isSuspended }) => isSuspended) &&
        s.state.pendingDecision === undefined,
      4000,
    );

    const triggersOf = (permanentId: string, clause: string) =>
      s.events.filter(
        (event) =>
          event.kind === "effectTriggered" &&
          event.sourcePermanentId === permanentId &&
          event.effectKey.includes(clause),
      ).length;
    const suspendClause = "When any of your opponent's Digimon or Tamers suspend";
    const trashClause = "When effects trash cards from under this Tamer";

    // Six distinct suspended-event occurrences remain available in the ordering
    // plans, but have no legal evolution left to activate. Repeated order prompts
    // list a pending occurrence again, so count its unique key rather than prompts.
    const offeredKeys = [...new Set(s.decisions.flatMap(({ req }) => req.options?.triggerKeys ?? []))];
    const offersOf = (permanentId: string, clause: string) => {
      const instanceId = human.battleArea.find((p) => p.permanentId === permanentId)!.topCard.instanceId;
      return offeredKeys.filter((key) => key.startsWith(`${instanceId}::`) && key.includes(clause)).length;
    };
    expect(yoshinos.map((permanentId) => offersOf(permanentId, suspendClause))).toEqual([2, 2, 2]);
    expect(yoshinos.map((permanentId) => triggersOf(permanentId, suspendClause))).toEqual([0, 0, 0]);
    expect(yoshinos.map((permanentId) => offersOf(permanentId, trashClause))).toEqual([1, 0, 0]);
    expect(yoshinos.map((permanentId) => triggersOf(permanentId, trashClause))).toEqual([0, 0, 0]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
