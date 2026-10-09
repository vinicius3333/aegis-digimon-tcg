import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario, type DevScenarioId } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

async function start(id: DevScenarioId) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
    },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

it("#5297 arena Main: projects both physical pairs, merges the selected second pair and rejects Merciful DNA", async () => {
  const { s, loop } = await start("arena-github-5297-omnimon-main-dna");
  try {
    const player = s.state.players[0]!;
    const [grey, firstGaruru, secondGaruru] = player.battleArea;
    const omnimon = player.hand.find((card) => card.cardId === "EX13-016")!;
    const merciful = player.hand.find((card) => card.cardId === "EX13-077")!;
    const pairs = [...omnimon.dnaDigivolveRoutes].map((route) => JSON.parse(route.materialPermanentIdsJson));
    expect(pairs).toEqual([
      [grey!.permanentId, firstGaruru!.permanentId],
      [grey!.permanentId, secondGaruru!.permanentId],
    ]);
    expect(merciful.dnaDigivolveRoutes).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        instanceId: merciful.instanceId,
        materialPermanentIds: pairs[1],
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        instanceId: omnimon.instanceId,
        materialPermanentIds: pairs[1],
      }),
    ).toEqual({ ok: true });
    await settle(
      () => player.battleArea.some((p) => p.topCard.cardId === "EX13-016") && s.state.pendingDecision === undefined,
    );
    expect(player.battleArea).toHaveLength(2);
    expect(player.battleArea.some((p) => p.permanentId === firstGaruru!.permanentId)).toBe(true);
    const merged = player.battleArea.find((p) => p.topCard.cardId === "EX13-016")!;
    expect(merged.isSuspended).toBe(false);
    expect(merged.stack.map((card) => card.cardId)).toEqual(["BT1-029", "BT22-026", "BT22-008", "BT22-013"]);
    expect(s.state.memory).toBe(2);
    expect(player.hand.some((card) => card.instanceId === merciful.instanceId)).toBe(true);
  } finally {
    if (s.state.phase === Phase.Breeding) {
      const seat = s.state.turnSeat;
      s.engine.applyIntent(seat, { type: "endPhase" });
      await advance(s.engine).waitForMainPhase(seat);
    }
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it("#5297 arena end of turn: Agumon merges the same printed level6 pair before the opponent turn", async () => {
  const { s, loop } = await start("arena-github-5297-omnimon-agumon-dna");
  try {
    const player = s.state.players[0]!;
    const omnimon = player.hand.find((card) => card.cardId === "EX13-016")!;
    expect(omnimon.dnaDigivolveRoutes).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(
      () => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined,
    );
    expect(player.battleArea).toHaveLength(1);
    const merged = player.battleArea[0]!;
    expect(merged.topCard.instanceId).toBe(omnimon.instanceId);
    expect(merged.isSuspended).toBe(false);
    expect(merged.stack.map((card) => card.cardId)).toEqual(["BT17-027", "BT22-008", "BT22-013"]);
    expect(player.hand.some((card) => card.cardId === "EX13-077")).toBe(true);
    expect(s.state.memory).toBe(3);
    expect(
      s.events.some(
        (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT22-008" && event.isInherited,
      ),
    ).toBe(true);
    const trigger = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT22-008",
    );
    const merge = s.events.findIndex(
      (event) => event.kind === "cardPlayed" && event.cardId === "EX13-016" && event.mechanic === "dna",
    );
    expect(merge).toBeGreaterThan(trigger);
  } finally {
    if (s.state.phase === Phase.Breeding) {
      const seat = s.state.turnSeat;
      s.engine.applyIntent(seat, { type: "endPhase" });
      await advance(s.engine).waitForMainPhase(seat);
    }
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
