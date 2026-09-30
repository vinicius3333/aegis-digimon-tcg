import { expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import type { Seat } from "@aegis/shared";
import {
  setupEngine,
  settle,
  type EngineSetup,
  type PermanentSpec,
  type SeatSpec,
  type SetupEngineOptions,
} from "../../engine/testkit/harness.js";
import "../index.js";

export const STARTING_MEMORY = 10;

/**
 * Seat 0 holds an established `trainingId` Option (alias `training`) in its battle area next
 * to `own`, with STARTING_MEMORY memory on its own turn, so its ＜Delay＞ can be activated.
 */
export async function setupTraining(
  trainingId: string,
  own: SeatSpec,
  opponent: SeatSpec = {},
  options: SetupEngineOptions = {},
): Promise<EngineSetup> {
  const training: PermanentSpec = { card: trainingId, as: "training" };
  const s = setupEngine(
    {
      0: { ...own, battleArea: [training, ...(own.battleArea ?? [])] },
      1: opponent,
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, ...options },
  );
  s.state.memory = STARTING_MEMORY;
  s.state.turnCount = 1;
  await s.ready();
  return s;
}

/** Activate the Training's ＜Delay＞ and wait until its resolution is done. */
export async function activateDelay(s: EngineSetup): Promise<void> {
  const trainingId = s.inst("training").instanceId;
  const [delay] = JSON.parse(s.perm("training").activatableEffectsJson || "[]") as { effectKey: string }[];
  expect(delay, "the ＜Delay＞ ability must be activatable").toBeDefined();
  expect(
    s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: trainingId, effectKey: delay!.effectKey }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.trash.some((card) => card.instanceId === trainingId) &&
      s.state.pendingDecision === undefined,
  );
  await settle(() => false, 40);
  expect(s.state.pendingDecision).toBeUndefined();
}

export function memorySpent(s: EngineSetup): number {
  return STARTING_MEMORY - s.state.memory;
}

export function inZone(s: EngineSetup, seat: Seat, zone: "hand" | "trash" | "deck", alias: string): boolean {
  return s.state.players[seat]![zone].some((card) => card.instanceId === s.inst(alias).instanceId);
}

export function onField(s: EngineSetup, seat: Seat, alias: string): boolean {
  const instanceId = s.inst(alias).instanceId;
  return s.state.players[seat]!.battleArea.some(
    (permanent) => permanent.topCard.instanceId === instanceId || permanent.stack.some((card) => card.instanceId === instanceId),
  );
}

/** Every id any decision offered since the setup began. */
export function everOffered(s: EngineSetup): Set<string> {
  return new Set(
    s.decisions.flatMap(({ req }) => [...(req.options?.candidateInstanceIds ?? []), ...(req.options?.visibleInstanceIds ?? [])]),
  );
}

/**
 * The Training's ＜Delay＞ digivolves `host` into `target` in hand through `target`'s own
 * alternate digivolution condition; returns the setup after the digivolution.
 */
export async function delayDigivolvesThroughAlternateCondition(
  trainingId: string,
  own: SeatSpec,
  opponent: SeatSpec,
  expectedCost: number,
  targetCardId: string,
): Promise<EngineSetup> {
  const s = await setupTraining(trainingId, own, opponent);
  await activateDelay(s);
  expect(s.perm("host").topCard.cardId).toBe(targetCardId);
  expect(inZone(s, 0, "hand", "target")).toBe(false);
  expect(memorySpent(s)).toBe(expectedCost);
  return s;
}

/**
 * A LIBERATOR [Hand] [Main] card (`target`) whose own route places `material` from trash under
 * `host` and ignores requirements. The Training's ＜Delay＞ cannot run it at the same time, so
 * a host that fails `target`'s ordinary requirements stays put and the material stays in trash.
 */
export async function expectDelayCannotUseHandMainRoute(
  trainingId: string,
  cards: { host: string; tamer: string; material: string; target: string },
): Promise<void> {
  const s = await setupTraining(trainingId, {
    battleArea: [{ card: cards.host, as: "host" }, { card: cards.tamer, as: "tamer" }],
    trash: [{ card: cards.material, as: "material" }],
    hand: [{ card: cards.target, as: "target" }],
  });
  await activateDelay(s);

  expect(everOffered(s).has(s.inst("target").instanceId)).toBe(false);
  expect(s.perm("host").topCard.cardId).toBe(cards.host);
  expect(inZone(s, 0, "hand", "target")).toBe(true);
  expect(inZone(s, 0, "trash", "material")).toBe(true);
  expect(memorySpent(s)).toBe(0);
}

/** The ＜Delay＞ digivolves Digimon only: a Tamer is never offered as the digivolving permanent. */
export async function expectDelayIgnoresTamers(trainingId: string, tamerId: string, tamerDigimonId: string): Promise<void> {
  const s = await setupTraining(trainingId, {
    battleArea: [{ card: tamerId, as: "tamer" }],
    hand: [{ card: tamerDigimonId, as: "target" }],
  });
  await activateDelay(s);

  expect(everOffered(s).has(s.perm("tamer").permanentId)).toBe(false);
  expect(s.perm("tamer").topCard.cardId).toBe(tamerId);
  expect(s.perm("tamer").stack).toHaveLength(0);
  expect(inZone(s, 0, "hand", "target")).toBe(true);
  expect(memorySpent(s)).toBe(0);
}

/** Declining the ＜Delay＞ digivolution still trashes the Option and leaves the host alone. */
export async function expectDelayMayDecline(trainingId: string, hostId: string, targetId: string): Promise<void> {
  const s = await setupTraining(
    trainingId,
    { battleArea: [{ card: hostId, as: "host" }], hand: [{ card: targetId, as: "target" }] },
    {},
    { autoAcceptOptional: false, autoDeclineOptional: true },
  );
  await activateDelay(s);

  expect(inZone(s, 0, "trash", "training")).toBe(true);
  expect(s.perm("host").topCard.cardId).toBe(hostId);
  expect(inZone(s, 0, "hand", "target")).toBe(true);
  expect(memorySpent(s)).toBe(0);
}

/** A same-color card whose printed requirements the host fails is not a legal ＜Delay＞ target. */
export async function expectDelayKeepsRequirements(trainingId: string, hostId: string, targetId: string): Promise<void> {
  const s = await setupTraining(trainingId, {
    battleArea: [{ card: hostId, as: "host" }],
    hand: [{ card: targetId, as: "target" }],
  });
  await activateDelay(s);

  expect(everOffered(s).has(s.inst("target").instanceId)).toBe(false);
  expect(s.perm("host").topCard.cardId).toBe(hostId);
  expect(inZone(s, 0, "hand", "target")).toBe(true);
}

/**
 * Burst digivolution would return `tamer` to hand for a cost of 0; the ＜Delay＞ only offers an
 * ordinary digivolution, paying the printed cost minus 2 and leaving the Tamer in play.
 */
export async function expectDelayDoesNotBurst(
  trainingId: string,
  cards: { host: string; tamer: string; target: string },
  ordinaryCost: number,
  memoryGainedOnDigivolve = 0,
): Promise<void> {
  const s = await setupTraining(trainingId, {
    battleArea: [{ card: cards.host, as: "host" }, { card: cards.tamer, as: "tamer" }],
    hand: [{ card: cards.target, as: "target" }],
  });
  await activateDelay(s);

  expect(s.perm("host").topCard.cardId).toBe(cards.target);
  expect(s.perm("tamer").topCard.cardId).toBe(cards.tamer);
  expect(inZone(s, 0, "hand", "tamer")).toBe(false);
  expect(memorySpent(s) + memoryGainedOnDigivolve).toBe(ordinaryCost - 2);
}

/**
 * DNA digivolution would merge both hosts for a cost of 0; the ＜Delay＞ only digivolves 1
 * Digimon, for the printed cost minus 2, and the other host stays a separate Digimon.
 */
export async function expectDelayDoesNotDna(
  trainingId: string,
  cards: { first: string; second: string; target: string },
  ordinaryCost: number,
): Promise<void> {
  const s = await setupTraining(trainingId, {
    battleArea: [{ card: cards.first, as: "first" }, { card: cards.second, as: "second" }],
    hand: [{ card: cards.target, as: "target" }],
  });
  await activateDelay(s);

  const digimon = s.state.players[0]!.battleArea;
  const evolved = digimon.filter((permanent) => permanent.topCard.cardId === cards.target);
  expect(evolved).toHaveLength(1);
  expect(evolved[0]!.stack).toHaveLength(1);
  expect(digimon.map(({ permanentId }) => permanentId)).toEqual(
    expect.arrayContaining([s.perm("first").permanentId, s.perm("second").permanentId]),
  );
  expect(memorySpent(s)).toBe(ordinaryCost - 2);
}

/**
 * A Hybrid Digimon digivolves from hand onto a Tamer as if it were a level 3 Digimon: the Tamer
 * card becomes a digivolution card and is trashed like one when the Digimon is deleted.
 */
export async function expectTamerBecomesDigivolutionCard(tamerId: string, hybridId: string): Promise<void> {
  const s = setupEngine({ 0: { battleArea: [{ card: tamerId, as: "tamer" }], hand: [{ card: hybridId, as: "hybrid" }] } });
  s.state.memory = STARTING_MEMORY;
  await s.ready();
  const tamerCardId = s.inst("tamer").instanceId;

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("tamer").permanentId,
      instanceId: s.inst("hybrid").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("tamer").topCard.cardId === hybridId && s.state.pendingDecision === undefined);
  expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toContain(tamerCardId);

  expect(await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId])).toBe(1);
  expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
    expect.arrayContaining([tamerCardId, s.inst("hybrid").instanceId]),
  );
  expect(s.state.players[0]!.battleArea).toHaveLength(0);
}
