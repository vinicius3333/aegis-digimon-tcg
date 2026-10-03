import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const AGUMON = "dev-perm-0-ym-agumon";
const YOSHINOS = ["paying", "second", "third"].map((slot) => `dev-perm-0-ym-yoshino-${slot}`);

describe("BT26 Yoshino production match b3759aa7 arena scenario", () => {
  it("replays the logged combo and lets a waiting Yoshino digivolve (Discord 1555741214014447737)", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: ["dev-perm-1-ym-dynasmon", "dev-field-0-ym-yoshino-paying", "dev-ym-ravemon"],
        declinePrompts: ["Place 1 card(s) from hand", "Prevent leaving"],
      },
    );
    layDevScenario("arena-bt26-yoshino-match-b3759aa7", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(4);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: AGUMON,
        instanceId: "dev-ym-geogreymon",
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea.find(({ permanentId }) => permanentId === AGUMON)?.topCard.cardId === "ST24-05" &&
        s.state.pendingDecision === undefined,
    );
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: AGUMON, instanceId: "dev-ym-lilamon" })).toEqual({
      ok: true,
    });
    await settle(() => s.state.turnSeat === 1 || s.state.gameOver, 8000);

    const onDeletionOrder = s.decisions.find(
      ({ req }) => req.kind === "orderTriggers" && req.options?.triggerCardIds?.includes("BT26-005"),
    )?.req.options;
    expect(onDeletionOrder?.triggerCardIds).toEqual(["BT26-005", "BT26-082"]);
    expect(onDeletionOrder?.waitingTriggerCardIds?.length).toBeGreaterThanOrEqual(4);
    expect(new Set(onDeletionOrder?.waitingTriggerCardIds)).toEqual(new Set(["BT26-091"]));

    let resolvingSource: string | undefined;
    const digivolvedByYoshino: string[] = [];
    for (const event of s.events) {
      if (event.kind === "effectTriggered") resolvingSource = event.sourcePermanentId;
      if (event.kind === "digivolved" && resolvingSource !== undefined && YOSHINOS.includes(resolvingSource))
        digivolvedByYoshino.push(event.cardId);
    }
    expect(digivolvedByYoshino).toContain("BT26-076");
    expect(human.battleArea.some(({ permanentId, isSuspended }) => YOSHINOS.includes(permanentId) && isSuspended)).toBe(
      true,
    );

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
