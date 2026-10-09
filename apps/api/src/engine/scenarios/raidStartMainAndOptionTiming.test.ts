import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario, type DevScenarioId } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";

async function start(id: DevScenarioId) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: ["new-report-red"] },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  const seat = s.state.turnSeat;
  expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(seat);
  return { s, loop };
}
async function finish({ s, loop }: Awaited<ReturnType<typeof start>>) {
  s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
  await loop;
  assertNoLoudGap(s);
}
it("GitHub #5387: Hexeblaumon costs four when evolving from Crescemon with three sources", async () => {
  const game = await start("arena-crescemon-hexeblaumon-cost");
  const { s } = game;
  try {
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-new-report-cresce",
        instanceId: "new-report-hexe",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]!.topCard.cardId === "EX7-023" && !s.state.pendingDecision);
    expect(s.state.memory).toBe(2);
  } finally {
    await finish(game);
  }
});
it("GitHub #5389: each Shota triggers once at Main entry and cannot be activated again", async () => {
  const game = await start("arena-shota-start-main-once");
  const { s } = game;
  try {
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.trash.filter((c) => c.cardId === "BT25-093")).toHaveLength(2);
    for (const p of s.state.players[0]!.battleArea) {
      expect(observe(s.engine).activatableEffects(p)).toEqual([]);
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: p.topCard.instanceId,
          effectKey: "BT26-092/ir-1-0",
        }),
      ).toEqual({ ok: false, reason: "illegal-target" });
    }
    expect(s.events.filter((e) => e.kind === "effectResolved" && e.sourceCardId === "BT26-092")).toHaveLength(2);
  } finally {
    await finish(game);
  }
});
it("GitHub #5388: Heat Training searches, enters battle area and releases the next public action", async () => {
  const game = await start("arena-heat-training-option-freeze");
  const { s } = game;
  try {
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "new-report-heat" })).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "LM-059") && !s.state.pendingDecision,
    );
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === "new-report-red")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "new-report-reserve" })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === "new-report-reserve") &&
        !s.state.pendingDecision,
    );
    expect(s.state.memory).toBe(2);
  } finally {
    await finish(game);
  }
});
it("GitHub #5391: Raid switches to Atratusmon after its real digivolution grants immunity", async () => {
  const game = await start("arena-raid-immune-atratusmon");
  const { s } = game;
  try {
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: "dev-perm-1-new-report-atratus",
        instanceId: "new-report-atratus-hand",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea[0]!.immuneToOpponentDigimonEffects && !s.state.pendingDecision);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-new-report-jupiter",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(
      s.events.some(
        (e) =>
          e.kind === "attackDeclared" &&
          e.redirected &&
          e.target.kind === "permanent" &&
          e.target.permanentId === "dev-perm-1-new-report-atratus",
      ),
    ).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(5);
  } finally {
    await finish(game);
  }
});
