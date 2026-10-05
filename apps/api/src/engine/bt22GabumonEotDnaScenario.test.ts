import { EffectTiming, Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { effectsOf } from "./effects/collect.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

it("Discord 1556299408700735548: Nokia recovers AD1 Omnimon before Gabumon's end-of-turn DNA", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferTriggerKeys: ["EX13-067", "BT22-017"],
    },
  );
  layDevScenario("arena-bt22-gabumon-eot-dna", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    const metal = s.state.players[0]!.hand.find((c) => c.instanceId === "dev-gabu-metal")!;
    const source = observe(s.engine).cardSource(metal);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source)[0]!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: metal.instanceId, effectKey })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined,
    );
    const digimon = s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId !== "EX13-067");
    expect(digimon.map((p) => p.topCard.cardId)).toEqual(["AD1-025"]);
    expect(digimon[0]!.stack.map((c) => c.cardId)).toEqual(
      expect.arrayContaining(["BT22-017", "BT22-026", "BT22-008", "BT22-013"]),
    );
    expect(s.state.memory).toBe(3);
    const nokia = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX13-067")!;
    expect(nokia.isSuspended).toBe(true);
    expect(s.events.some((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT22-017" && e.isInherited)).toBe(
      true,
    );
    expect(s.events.some((e) => e.kind === "cardPlayed" && e.cardId === "AD1-025" && e.mechanic === "dna")).toBe(true);
  } finally {
    if (s.state.phase === Phase.Breeding) {
      s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      await advance(s.engine).waitForMainPhase(s.state.turnSeat);
    }
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
