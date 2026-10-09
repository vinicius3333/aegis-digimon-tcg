import { Phase, type Seat } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario, type DevScenarioId } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, type SetupEngineOptions } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

async function start(id: DevScenarioId, options: SetupEngineOptions = {}) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      ...options,
    },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}
async function finish({ s, loop }: Awaited<ReturnType<typeof start>>) {
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}
function hand(s: ReturnType<typeof setupEngine>, id: string) {
  return s.state.players[0]!.hand.find((c) => c.cardId === id)!;
}
function field(s: ReturnType<typeof setupEngine>, id: string, seat: Seat = 0) {
  return s.state.players[seat]!.battleArea.find((p) => p.topCard.cardId === id)!;
}
async function idle(s: ReturnType<typeof setupEngine>) {
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && s.state.pendingDecision === undefined);
}

it("Discord 1556989618258321418 arena: Sanmyojin deletes Partition entrants before On Play", async () => {
  const run = await start("arena-oct06-zero-dp-partition");
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: field(s, "EX12-048").permanentId,
      instanceId: hand(s, "EX12-076").instanceId,
    }),
  ).toEqual({ ok: true });
  await idle(s);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.state.players[1]!.trash.map((c) => c.cardId)).toEqual(
    expect.arrayContaining(["BT23-047", "EX13-041", "EX13-021"]),
  );
  expect(
    s.events.some(
      (e) => e.kind === "effectTriggered" && e.timing === "OnPlay" && ["EX13-041", "EX13-021"].includes(e.sourceCardId),
    ),
  ).toBe(false);
  await finish(run);
});

it("Discord 1556939406642913291 arena: the nested Megidramon evolution gets Blitz", async () => {
  const run = await start("arena-oct06-takato-blitz");
  const { s } = run;
  const baseId = field(s, "EX2-009").permanentId;
  expect(
    s.engine.applyIntent(0, { type: "digivolve", permanentId: baseId, instanceId: hand(s, "AD1-003").instanceId }),
  ).toEqual({ ok: true });
  await settle(() => field(s, "BT21-079") !== undefined && s.state.pendingDecision === undefined);
  // The real turn loop may already open Blitz's attack decision; accepting it completes
  // the attack and proves the granted keyword has a behavioral consequence.
  await settle(() => observe(s.engine).hasKeyword(baseId, "Blitz") && s.state.pendingDecision === undefined);
  expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: baseId, target: { kind: "player" } })).toEqual({
    ok: true,
  });
  expect(field(s, "EX2-056")).toBeDefined();
  await advance(s.engine).finishAttack();
  await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
  await finish(run);
});

it("Discord 1556889318151422033 arena: Partition supplies DNA materials before Dragon Gene", async () => {
  const preferred: string[] = [];
  const run = await start("arena-oct06-partition-dragon-gene", {
    preferTriggerKeys: ["BT23-047"],
    preferInstanceIds: preferred,
  });
  const { s } = run;
  const examon = field(s, "BT23-047");
  preferred.push(...examon.stack.filter((c) => ["EX13-041", "EX13-021"].includes(c.cardId)).map((c) => c.instanceId));
  const nextId = hand(s, "BT23-047").instanceId;
  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: examon.permanentId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  await idle(s);
  expect(field(s, "BT23-047").topCard.instanceId).toBe(nextId);
  expect(field(s, "EX1-066").isSuspended).toBe(true);
  expect(s.state.memory).toBe(4);
  await finish(run);
});

it("Discord 1556885028401844324 arena: promotion removes Groundramon's pending inherited effect", async () => {
  const run = await start("arena-oct06-inherited-battle");
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: field(s, "BT13-065").permanentId,
      target: { kind: "permanent", permanentId: field(s, "BT23-047", 1).permanentId },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  await idle(s);
  expect(field(s, "EX13-041", 1)).toBeDefined();
  expect(s.state.players[0]!.security).toHaveLength(3);
  await finish(run);
});

it("Discord 1556992097352032276 arena: start-turn Overflow ends Active before breeding", async () => {
  const run = await start("arena-oct06-active-overflow");
  const { s } = run;
  const deckBefore = s.state.players[1]!.deck.length;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT1-010").instanceId })).toEqual({
    ok: true,
  });
  await settle(
    () => s.state.turnCount === 3 && s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined,
  );
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  expect(s.state.players[1]!.deck).toHaveLength(deckBefore);
  expect(s.state.players[1]!.breeding).toBeDefined();
  expect(s.events.some((e) => e.kind === "phaseChanged" && e.turnSeat === 1 && e.phase !== Phase.Active)).toBe(false);
  await finish(run);
});
