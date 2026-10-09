import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

it("GitHub #5344 arena: Revelation security DP expires after its owner's pending Mistymon attack", async () => {
  const duringAttack: number[] = [];
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      onEvent: (event): void => {
        if (event.kind === "securityChecked") duringAttack.push(s.state.players[1]!.battleArea[0]!.currentDP);
      },
    },
  );
  layDevScenario("arena-github5344-revelation-expiry", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.state.players[0]!.battleArea[0]!.permanentId,
      instanceId: "dev-revelation-mistymon",
      useAlternateCost: true,
      alternateRequirementIndex: 0,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
  expect(duringAttack).toEqual([1000]);
  expect(s.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "securityChecked", battle: expect.objectContaining({ securityCardDP: 5000 }) }),
    ]),
  );
  expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(12000);
  expect(s.state.players[1]!.securityDpDelta).toBe(0);
  expect(s.state.pendingDecision).toBeUndefined();
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: "dev-revelation-late" })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.battleArea.length === 2);
  expect(s.state.players[1]!.battleArea[1]!.currentDP).toBe(10000);
  await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  assertNoLoudGap(s);
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
