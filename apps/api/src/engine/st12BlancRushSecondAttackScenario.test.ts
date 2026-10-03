import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

it("Discord 1555876325355421716: Royal Knights / Leopardmon / Blanc resumes Main and attacks again", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoChooseOption: true,
      preferOptionIndex: 1,
      autoSelectCards: true,
      preferInstanceIds: ["dev-blanc-rush-blanc"],
    },
  );
  layDevScenario("arena-st12-blanc-rush-second-attack", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    for (let tick = 0; tick < 1000 && s.state.phase !== Phase.Breeding; tick += 1) await Promise.resolve();
    expect(s.state.phase).toBe(Phase.Breeding);
    // King Drasil is a Digi-Egg: breeding has no legal action and auto-skips.
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: false, reason: "wrong-phase" });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-blanc-rush-omnimon" })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackEnded"));
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const blanc = human.battleArea.find(({ topCard }) => topCard.cardId === "ST12-12")!;
    expect(human.breeding).toBeUndefined();
    expect(human.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining(["BT13-112", "BT20-102", "BT20-060", "BT22-052", "ST12-12"]),
    );
    expect(s.state.memory).toBe(2);
    expect(opponent.security).toHaveLength(2);
    expect(blanc.enterFieldTurnCount).toBe(s.state.turnCount);
    expect(blanc.isSuspended).toBe(false);
    expect(blanc.keywords).toContain("Rush");
    expect(blanc.summoningSick).toBe(false);
    expect(blanc.canAttackPlayer).toBe(true);
    const intent = {
      type: "attack" as const,
      attackerPermanentId: blanc.permanentId,
      target: { kind: "player" as const },
    };
    expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "attackEnded").length === 2);
    expect(blanc.isSuspended).toBe(true);
    expect(blanc.canAttackPlayer).toBe(false);
    expect(s.engine.applyIntent(0, intent)).toEqual({ ok: false, reason: "illegal-target" });
    expect(opponent.security).toHaveLength(1);
    expect(s.state.memory).toBe(2);
    expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory")).toHaveLength(1);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
