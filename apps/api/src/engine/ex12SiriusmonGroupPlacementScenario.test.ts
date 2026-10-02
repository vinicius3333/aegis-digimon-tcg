import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const HAND_MATERIAL = "dev-siriusmon-hand-material";
const TRASH_MATERIAL = "dev-siriusmon-trash-material";

describe("EX12 Siriusmon group placement arena scenario (Discord 1555224478416633927)", () => {
  it("asks top or bottom once and places both cards together at the chosen end", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderCards: false,
        preferInstanceIds: [HAND_MATERIAL, TRASH_MATERIAL],
      },
    );
    layDevScenario("arena-ex12-siriusmon-group-placement", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const base = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX12-014")!;
    const target = s.state.players[1]!.battleArea.find(({ topCard }) => topCard.cardId === "AD1-007")!;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: "dev-siriusmon" }),
    ).toEqual({ ok: true });

    const placementPrompts = () => s.decisions.filter(({ req }) => req.kind === "chooseOption");
    await settle(() => placementPrompts().length > 0);
    expect(placementPrompts()[0]!.req.options?.choices).toEqual(["top", "bottom"]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placementPrompts()[0]!.req.decisionId,
        response: { kind: "chooseOption", optionIndex: 1 },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.decisions.some(({ req }) => req.kind === "orderCards"));
    const ordering = s.decisions.find(({ req }) => req.kind === "orderCards")!;
    expect(ordering.req.options?.orderDestination).toBe("stackBottom");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.req.decisionId,
        response: { kind: "orderCards", order: [TRASH_MATERIAL, HAND_MATERIAL] },
      }),
    ).toEqual({ ok: true });
    await settle(() => target.currentDP === 4000 && s.state.pendingDecision === undefined);

    expect(placementPrompts()).toHaveLength(1);
    const siriusmon = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === base.permanentId)!;
    expect(siriusmon.topCard.cardId).toBe("EX12-018");
    expect(siriusmon.stack.map(({ instanceId }) => instanceId).slice(0, 2)).toEqual([TRASH_MATERIAL, HAND_MATERIAL]);
    expect(siriusmon.stack.map(({ cardId }) => cardId)).toEqual(["BT10-050", "EX12-013", "EX12-007", "EX12-014"]);
  });
});
