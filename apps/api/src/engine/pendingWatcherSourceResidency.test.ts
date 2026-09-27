import { Phase } from "@aegis/shared";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";
it.each([4, 2])(
  "revalidates Moon deletion watcher after ShadowSeraphimon resolves from %s security",
  async (initialSecurity) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-050", as: "shadow" }, "BT2-090"],
          hand: [{ card: "BT2-109", as: "heat" }],
          security: Array(initialSecurity).fill("BT1-009"),
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT19-075", as: "moon" },
            { card: "BT2-070", as: "tapir" },
          ],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [], preferTriggerKeys: ["EX4-050"] },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("heat").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT19-075")).toBe(initialSecurity === 2);
    expect(s.state.players[0]!.security).toHaveLength(initialSecurity === 4 ? 5 : 2);
    expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT19-075")).toHaveLength(
      initialSecurity === 4 ? 0 : 1,
    );
  },
);

it("runs the Moon source-residency arena and preserves the legitimate Tapirmon On Deletion", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startDevScenario("arena-moon-pending-source-deleted");
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const heat = s.state.players[0]!.hand.find((c) => c.cardId === "BT2-109")!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: heat.instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.security).toHaveLength(5);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT19-075")).toHaveLength(0);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
