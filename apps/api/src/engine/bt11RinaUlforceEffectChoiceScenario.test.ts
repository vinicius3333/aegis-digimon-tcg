import { Phase, getCardDefinition, printedClausesForTrigger } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const ULFORCE = "dev-field-0-rina-choice-ulforce";
const FEWEST = "dev-field-1-rina-choice-fewest";
const STACKED = "dev-field-1-rina-choice-stacked";

describe("BT11 Rina / EX13 Ulforce effect choice arena", () => {
  it("Discord 1555770458866065499: displays both printed effects and returns only the fewest-source target", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferTriggerKeys: ["BT11-112"],
        preferOptionIndex: 1,
      },
    );
    layDevScenario("arena-bt11-rina-ulforce-effect-choice", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const ulforce = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === ULFORCE)!;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: ulforce.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.deck.some(({ instanceId }) => instanceId === FEWEST) &&
        s.state.pendingDecision === undefined &&
        s.events.some((event) => event.kind === "securityChecked"),
    );
    const request = s.decisions.find(({ req }) => req.kind === "chooseOption" && req.sourceCardId === "BT11-112")?.req;
    expect(request?.options?.choices).toEqual(
      printedClausesForTrigger({
        definition: getCardDefinition("EX13-023")!,
        trigger: "WhenDigivolving",
        inherited: false,
      }),
    );
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(FEWEST);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([STACKED]);
    expect(s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT11-112")?.isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
