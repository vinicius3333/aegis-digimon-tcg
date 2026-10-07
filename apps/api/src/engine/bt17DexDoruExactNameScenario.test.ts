import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const PREVENT_PROMPT = "Prevent leaving the battle area?";

describe("BT17 DexDoruGreymon exact-name Discord arena scenario (1557128872544313456)", () => {
  it("offers the [Trash] effect for DoruGreymon but not for a DexDoruGreymon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true, preferInstanceIds },
    );
    layDevScenario("arena-bt17-dexdoru-exact-name", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const preventPrompts = () =>
      s.decisions.filter(({ req }) => req.kind === "optional" && req.promptText === PREVENT_PROMPT).length;
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;

    preferInstanceIds.splice(0, preferInstanceIds.length, "dev-field-0-dexdoru-near-name");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-dexdoru-disaster-1" })).toEqual({ ok: true });
    await settle(
      () =>
        human.trash.some(({ instanceId }) => instanceId === "dev-field-0-dexdoru-near-name") &&
        s.state.pendingDecision === undefined,
    );
    const promptsForNearName = preventPrompts();
    const trashCopyStayed = human.trash.some(({ instanceId }) => instanceId === "dev-dexdoru-trash");

    preferInstanceIds.splice(0, preferInstanceIds.length, "dev-field-0-dexdoru-doru-greymon");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-dexdoru-disaster-2" })).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea.some(
          ({ permanentId, topCard }) =>
            permanentId === "dev-perm-0-dexdoru-doru-greymon" && topCard.cardId === "BT17-067",
        ) && s.state.pendingDecision === undefined,
    );

    const protectedDigimon = human.battleArea.find(
      ({ permanentId }) => permanentId === "dev-perm-0-dexdoru-doru-greymon",
    );
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    expect(promptsForNearName).toBe(0);
    expect(trashCopyStayed).toBe(true);
    expect(preventPrompts()).toBeGreaterThanOrEqual(1);
    expect(protectedDigimon?.stack.some(({ cardId }) => cardId === "BT16-061")).toBe(true);
  });
});
