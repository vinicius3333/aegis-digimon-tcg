import { describe, expect, it } from "vitest";
import type { CardInstance, Permanent } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type BoardSpec } from "../../engine/testkit/harness.js";
import "../index.js";

const DEFAULT_SEED = 0x0e90074;
const DEFAULT_CASES = 48;

function configuredInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function choose<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)]!;
}

function cardsInPermanent(permanent: Permanent | undefined): CardInstance[] {
  if (permanent === undefined) return [];
  return [permanent.topCard, ...permanent.stack, ...permanent.linked].filter(
    (card): card is CardInstance => card !== undefined,
  );
}

function allInstances(setup: ReturnType<typeof setupEngine>): CardInstance[] {
  return Array.from(setup.state.players).flatMap((player) => [
    ...player.hand,
    ...player.deck,
    ...player.eggDeck,
    ...player.trash,
    ...player.security,
    ...player.delayZone,
    ...(player.resolvingOption === undefined ? [] : [player.resolvingOption]),
    ...Array.from(player.battleArea).flatMap((permanent) => cardsInPermanent(permanent)),
    ...cardsInPermanent(player.breeding),
  ]);
}

function allInstanceIds(setup: ReturnType<typeof setupEngine>): string[] {
  return allInstances(setup).map(({ instanceId }) => instanceId);
}

function ownershipByInstance(setup: ReturnType<typeof setupEngine>): Map<string, number> {
  return new Map(allInstances(setup).map(({ instanceId, ownerSeat }) => [instanceId, ownerSeat]));
}

function expectCardConservation(
  setup: ReturnType<typeof setupEngine>,
  before: readonly string[],
  ownersBefore: ReadonlyMap<string, number>,
  label: string,
): void {
  const after = allInstanceIds(setup);
  expect(new Set(after).size, `${label}: duplicate card instance`).toBe(after.length);
  expect(after.toSorted(), `${label}: card instance entered or left the game`).toEqual(before.toSorted());
  expect(ownershipByInstance(setup), `${label}: card ownership changed`).toEqual(ownersBefore);
}

describe("EX9 deterministic fuzz properties", () => {
  const seed = configuredInteger("EX9_FUZZ_SEED", DEFAULT_SEED);
  const cases = configuredInteger("EX9_FUZZ_CASES", DEFAULT_CASES);

  it(`preserves Titamon payment semantics across ${cases} generated cases (seed ${seed})`, async () => {
    const random = seededRandom(seed);
    const payments = ["BT1-024", "EX9-038", "BT1-009"] as const;

    for (let index = 0; index < cases; index += 1) {
      const payment = choose(random, payments);
      const eligible = payment !== "BT1-009";
      const accept = random() < 0.5;
      const label = `seed=${seed} case=${index} payment=${payment} accept=${accept}`;
      const setup = setupEngine(
        {
          0: {
            hand: [{ card: payment, as: "payment" }, { card: "EX9-065", as: "titamon" }],
            deck: ["BT1-009", "BT1-010", "BT1-011"],
          },
          1: { security: ["BT1-009", "BT1-010"] },
        },
        { autoDeclineOptional: !accept, autoSelectCards: true },
      );
      setup.state.memory = 10;
      const before = allInstanceIds(setup);
      const ownersBefore = ownershipByInstance(setup);

      expect(
        setup.engine.applyIntent(0, { type: "playCard", instanceId: setup.inst("titamon").instanceId }),
        label,
      ).toEqual({ ok: true });
      if (eligible && accept) {
        await settle(() => setup.state.pendingDecision?.kind === "optional");
        const reduction = setup.state.pendingDecision!;
        expect(
          setup.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: reduction.decisionId,
            response: { kind: "optional", accept: true },
          }),
          label,
        ).toEqual({ ok: true });
        await settle();
        const followUp = setup.state.pendingDecision;
        if (followUp?.kind === "optional") {
          expect(
            setup.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: followUp.decisionId,
              response: { kind: "optional", accept: false },
            }),
            label,
          ).toEqual({ ok: true });
        }
      }
      await settle();

      const reductionPaid = eligible && accept;
      expect(setup.state.memory, label).toBe(reductionPaid ? 5 : 3);
      expect(
        setup.state.players[0]!.trash.some(({ instanceId }) => instanceId === setup.inst("payment").instanceId),
        label,
      ).toBe(reductionPaid);
      expectCardConservation(setup, before, ownersBefore, label);
    }
  });

  it(`keeps three-card end-turn costs atomic across ${cases} generated cases (seed ${seed + 1})`, async () => {
    const random = seededRandom(seed + 1);

    for (let index = 0; index < cases; index += 1) {
      const eligibleCount = Math.floor(random() * 6);
      const accept = random() < 0.5;
      const payment = Array.from({ length: eligibleCount }, (_, paymentIndex) =>
        choose(random, ["EX9-023", "EX9-029", "EX9-034"] as const),
      );
      const label = `seed=${seed + 1} case=${index} eligible=${eligibleCount} accept=${accept}`;
      const setup = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX9-049", as: "source", under: ["EX9-046"] }],
            trash: [...payment, "BT1-009"],
            hand: ["EX9-074"],
            deck: ["BT1-010", "BT1-011", "BT1-048"],
          },
        },
        {
          autoAcceptOptional: accept,
          autoDeclineOptional: !accept,
          autoSelectCards: true,
          autoChooseOption: true,
        },
      );
      setup.state.memory = 5;
      const before = allInstanceIds(setup);
      const ownersBefore = ownershipByInstance(setup);
      const paymentCardIds = new Set<string>(payment);

      await advance(setup.engine).runTurn(0);
      await settle();

      const paid = accept && eligibleCount >= 3;
      expect(setup.perm("source").topCard.cardId, label).toBe(paid ? "EX9-074" : "EX9-049");
      const paidCards = setup.perm("source").stack.slice(0, 3);
      expect(paidCards.filter(({ cardId }) => paymentCardIds.has(cardId)).length, label).toBe(paid ? 3 : 0);
      expect(paidCards.filter(({ faceUp }) => faceUp === false).length, label).toBe(paid ? 3 : 0);
      expect(setup.state.pendingDecision, label).toBeUndefined();
      expectCardConservation(setup, before, ownersBefore, label);
    }
  });

  it(`enforces EX9 Training OPT across turn boundaries (seed ${seed + 2})`, async () => {
    const random = seededRandom(seed + 2);
    const optCases = Math.min(cases, 12);

    for (let index = 0; index < optCases; index += 1) {
      const initialFaceDown = Math.floor(random() * 4);
      const label = `seed=${seed + 2} case=${index} initialFaceDown=${initialFaceDown}`;
      const board: BoardSpec = {
        0: {
          battleArea: [
            {
              card: "EX9-009",
              as: "source",
              under: Array.from({ length: initialFaceDown }, () => ({ card: "BT1-009", faceUp: false })),
            },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017"],
        },
        1: {
          deck: ["BT1-018", "BT1-019", "BT1-020", "BT1-021"],
          security: ["BT1-012", "BT1-013", "BT1-014"],
        },
      };
      const options = { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true } as const;
      const sameTurn = setupEngine(board, options);
      sameTurn.state.memory = 10;
      await sameTurn.ready();
      const sameTurnBefore = allInstanceIds(sameTurn);
      const sameTurnOwners = ownershipByInstance(sameTurn);

      function attack(setup: ReturnType<typeof setupEngine>): ReturnType<typeof setup.engine.applyIntent> {
        return setup.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: setup.perm("source").permanentId,
          target: { kind: "player" },
        });
      }

      expect(attack(sameTurn), label).toEqual({ ok: true });
      await settle(() => sameTurn.state.players[1]!.security.length === 2);
      expect(sameTurn.perm("source").stack, label).toHaveLength(initialFaceDown + 1);
      await advance(sameTurn.engine).verb.unsuspend([sameTurn.perm("source").permanentId]);
      expect(attack(sameTurn), label).toEqual({ ok: true });
      await settle(() => sameTurn.state.players[1]!.security.length === 1);
      expect(sameTurn.perm("source").stack, `${label}: fired twice in one turn`).toHaveLength(initialFaceDown + 1);
      expectCardConservation(sameTurn, sameTurnBefore, sameTurnOwners, label);

      const reset = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "EX9-009",
                as: "source",
                under: Array.from({ length: initialFaceDown }, () => ({ card: "BT1-009", faceUp: false })),
              },
            ],
            deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017"],
          },
          1: {
            deck: ["BT1-018", "BT1-019", "BT1-020", "BT1-021"],
            security: ["BT1-012", "BT1-013", "BT1-014"],
          },
        },
        options,
      );
      const resetBefore = allInstanceIds(reset);
      const resetOwners = ownershipByInstance(reset);
      const loop = reset.engine.startTurnLoop();
      await advance(reset.engine).waitForMainPhase(0);
      expect(attack(reset), label).toEqual({ ok: true });
      await settle();
      expect(reset.perm("source").stack, label).toHaveLength(initialFaceDown + 1);
      advance(reset.engine).endMainPhaseIfOpen(0);
      await advance(reset.engine).waitForMainPhase(1);
      advance(reset.engine).endMainPhaseIfOpen(1);
      await advance(reset.engine).waitForMainPhase(0);
      expect(attack(reset), label).toEqual({ ok: true });
      await settle();
      expect(reset.perm("source").stack, `${label}: did not reset next owner turn`).toHaveLength(initialFaceDown + 2);
      expectCardConservation(reset, resetBefore, resetOwners, label);
      expect(reset.engine.applyIntent(0, { type: "surrender" }), label).toEqual({ ok: true });
      await loop;
    }
  });

  it(`preserves identity and ownership through randomized EX9 play sequences (seed ${seed + 3})`, async () => {
    const random = seededRandom(seed + 3);
    const playableCards = ["EX9-007", "EX9-014", "EX9-023", "EX9-035", "EX9-046", "EX9-058"];

    for (let index = 0; index < cases; index += 1) {
      const sequence = Array.from({ length: 3 }, () => choose(random, playableCards));
      const label = `seed=${seed + 3} case=${index} sequence=${sequence.join(",")}`;
      const setup = setupEngine(
        {
          0: {
            hand: sequence.map((card, intentIndex) => ({ card, as: `play-${intentIndex}` })),
            deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
            trash: ["EX9-007", "EX9-014"],
          },
          1: {
            battleArea: [{ card: "BT10-064", as: "opponent", under: ["BT10-062"] }],
            security: ["BT1-009", "BT1-010", "BT1-011"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      setup.state.memory = 10;
      const before = allInstanceIds(setup);
      const ownersBefore = ownershipByInstance(setup);

      for (let intentIndex = 0; intentIndex < sequence.length; intentIndex += 1) {
        const played = setup.inst(`play-${intentIndex}`);
        expect(setup.engine.applyIntent(0, { type: "playCard", instanceId: played.instanceId }), label).toEqual({
          ok: true,
        });
        await settle();
        expect(
          setup.state.players[0]!.hand.some(({ instanceId }) => instanceId === played.instanceId),
          `${label}: accepted play remained in hand`,
        ).toBe(false);
        expectCardConservation(setup, before, ownersBefore, `${label} intent=${intentIndex}`);
      }

      expect(setup.state.memory, label).toBeGreaterThanOrEqual(-10);
      expect(setup.state.memory, label).toBeLessThanOrEqual(10);
      expect(setup.state.pendingDecision, label).toBeUndefined();
    }
  });
});
