import { describe, expect, it } from "vitest";
import { setupEngine } from "#api/engine/testkit/harness";
import { trainingObservation, type TrainingObservation } from "#api/bot/training/observation";
import { evaluateSearchPosition } from "#api/bot/evolution/evaluateSearchPosition";
import { BOT_PROFILES } from "#api/bot/profiles";

const SCORES_BEFORE_RECORDING_EXISTED = [
  [0.7698869542550567, 0.62168353749157, 0.9102770016236176],
  [0.9970162447343528, 0.998225513150012, 0.9976758049673051],
  [0.23396326673046913, 0.2872133155421877, 0.20889575538850189],
  [0.9734380384722824, 0.860249997411512, 0.9978106953668083],
];

function buildPositions(base: TrainingObservation): TrainingObservation[] {
  const variant = (change: (observation: TrainingObservation) => void) => {
    const observation = structuredClone(base);
    change(observation);
    return observation;
  };
  return [
    variant((observation) => {
      observation.memory = 3;
      observation.turnSeat = 0;
    }),
    variant((observation) => {
      observation.turnSeat = 0;
      observation.players[0]!.board[0]!.canAttackPlayer = true;
      observation.players[1]!.securityCount = 0;
      observation.players[1]!.board[0]!.suspended = true;
      observation.players[0]!.handCount = 11;
    }),
    variant((observation) => {
      observation.turnSeat = 1;
      observation.memory = -4;
      observation.players[0]!.securityCount = 0;
      observation.players[0]!.deckCount = 2;
      observation.players[0]!.board[0]!.suspended = true;
    }),
    variant((observation) => {
      observation.players[1]!.board[0]!.keywords = ["Blocker", "Piercing"];
      observation.players[0]!.board[0]!.keywords = ["Evade"];
      observation.players[0]!.board[0]!.securityAttack = 2;
      observation.players[0]!.securityCount = 7;
    }),
  ];
}

async function buildObservation(): Promise<TrainingObservation> {
  const setup = setupEngine({
    0: { battleArea: [{ card: "BT1-015", as: "attacker" }], hand: ["BT1-010"], security: ["BT1-010", "BT1-011"] },
    1: { battleArea: [{ card: "BT1-015", as: "attacker" }], security: ["BT1-010"] },
  });
  await setup.ready();
  return trainingObservation(setup.state, 0);
}

describe("search evaluation recorder", () => {
  it("keeps live bot scores bit-for-bit identical with or without a recorder", async () => {
    const positions = buildPositions(await buildObservation());
    positions.forEach((observation, position) => {
      Object.values(BOT_PROFILES).forEach((profile, profileIndex) => {
        const expected = SCORES_BEFORE_RECORDING_EXISTED[position]![profileIndex]!;
        expect(evaluateSearchPosition(observation, profile)).toBe(expected);
        expect(evaluateSearchPosition(observation, profile, () => undefined)).toBe(expected);
      });
    });
  });

  it("records components that add up to the score's logit", async () => {
    for (const observation of buildPositions(await buildObservation())) {
      let own = 0;
      let opponent = 0;
      const factors = new Set<string>();
      const score = evaluateSearchPosition(observation, BOT_PROFILES.balanced, ({ side, factor, value }) => {
        factors.add(factor);
        if (side === "own") {
          own += value;
        } else {
          opponent += value;
        }
      });
      expect(own - opponent).toBeCloseTo(Math.log(score / (1 - score)), 9);
      expect(factors.has("security")).toBe(true);
      expect(factors.has("memory")).toBe(true);
    }
  });
});
