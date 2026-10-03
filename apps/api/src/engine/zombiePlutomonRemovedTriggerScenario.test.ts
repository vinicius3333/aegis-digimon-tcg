import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("Discord 1555883726292914187: arena keeps both hands when nested De-Digivolve removes ZombiePlutomon", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoAcceptOptional: true });
  layDevScenario("arena-bt26-zombie-plutomon-removed-trigger", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const host = human.battleArea.find(({ permanentId }) => permanentId === "dev-perm-0-zombie-repro-host")!;
    const palmon = host.stack.find(({ cardId }) => cardId === "BT22-044")!;
    const effects = JSON.parse(host.activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: palmon.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard.cardId === "BT22-056" && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT26-059");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT26-079");
    expect(human.hand).toHaveLength(8);
    expect(s.state.players[1]!.hand).toHaveLength(6);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT26-079")).toBe(false);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
