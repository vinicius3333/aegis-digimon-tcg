import { expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type SeatSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

type Setup = ReturnType<typeof setupEngine>;

const FILLER = ["BT1-009", "BT1-009", "BT1-009"];

/** Seat 1 holds BT17-087 [Marcus Damon] in hand on top of `markerSeat`; seat 0 is `placerSeat`. */
export function boardWithOpposingMarcus(placerSeat: SeatSpec, markerSeat: SeatSpec, preferred: string[]): Setup {
  return setupEngine(
    {
      0: { deck: [...FILLER], security: ["BT1-009", "BT1-009"], ...placerSeat },
      1: {
        deck: [...FILLER],
        security: ["BT1-009", "BT1-009"],
        ...markerSeat,
        hand: [{ card: "BT17-087", as: "marcus" }, ...(markerSeat.hand ?? [])],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
  );
}

/** Seat 1 plays Marcus, whose [On Play] treats it as a 3000 DP Blocker Digimon, then hands the turn back. */
export async function playOpposingMarcusAsDigimon(s: Setup): Promise<void> {
  s.state.turnSeat = 1;
  s.state.memory = 4;
  await s.ready();
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker"));
  s.state.turnSeat = 0;
}

/**
 * With BT12-038 [GeoGreymon] as Marcus's bottom digivolution card: suspending Marcus fires
 * GeoGreymon's inherited -2000 DP on `placer` while Marcus is a Digimon, and does nothing
 * once Marcus's Digimon status ends.
 */
export async function expectGeoGreymonInheritedOnlyWhileMarcusIsDigimon(
  s: Setup,
  geoInstanceId: string,
  placer: string,
): Promise<void> {
  const marcusId = s.perm("marcus").permanentId;
  expect(s.perm("marcus").stack[0]?.instanceId).toBe(geoInstanceId);
  expect(observe(s.engine).canUseInheritedEffect(s.perm("marcus"), "BT12-038")).toBe(true);

  s.state.turnSeat = 1;
  const dpBeforeSuspend = s.perm(placer).currentDP;
  await advance(s.engine).verb.suspend([marcusId]);
  await settle(() => s.perm(placer).currentDP === dpBeforeSuspend - 2000);
  expect(s.perm(placer).currentDP).toBe(dpBeforeSuspend - 2000);

  await advance(s.engine).verb.unsuspend([marcusId]);
  s.state.turnSeat = 0;
  s.state.memory = 0;
  await advance(s.engine).runTurn(0);
  s.state.turnSeat = 1;
  expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(false);
  expect(s.perm("marcus").stack[0]?.instanceId).toBe(geoInstanceId);
  expect(observe(s.engine).canUseInheritedEffect(s.perm("marcus"), "BT12-038")).toBe(false);

  const dpAfterDigimonStatusEnds = s.perm(placer).currentDP;
  await advance(s.engine).verb.suspend([marcusId]);
  await drainMicrotasks();
  expect(s.perm("marcus").isSuspended).toBe(true);
  expect(s.perm(placer).currentDP).toBe(dpAfterDigimonStatusEnds);
}
