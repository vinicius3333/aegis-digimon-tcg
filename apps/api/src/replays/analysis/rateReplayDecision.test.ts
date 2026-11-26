import { describe, expect, it } from "vitest";
import { rateReplayDecision, type ReplayRolloutSample } from "#api/replays/analysis/rateReplayDecision";

const leaf = (reward: number): ReplayRolloutSample => ({ reward, terminal: false });
const ending = (reward: number): ReplayRolloutSample => ({ reward, terminal: true });
const spread = (center: number, count: number) =>
  Array.from({ length: count }, (_, sample) => leaf(center + ((sample % 3) - 1) * 0.02));

describe("rating a replay decision from paired rollouts", () => {
  it("does not call a 55-point gap from two agreeing rollouts a blunder", () => {
    const rating = rateReplayDecision({
      samples: [
        [leaf(0.054), leaf(0.056)],
        [leaf(0.6), leaf(0.62)],
        [leaf(0.04), leaf(0.035)],
      ],
      chosen: 0,
      rootValue: 0.47,
    });

    expect(rating.best).toBe(1);
    expect(rating.loss).toBeCloseTo(0.555, 3);
    expect(rating.quality).toBe("uncertain");
    expect(rating.settled).toBe(false);
  });

  it("confirms the blunder once enough paired rollouts keep the gap", () => {
    const rating = rateReplayDecision({ samples: [spread(0.06, 8), spread(0.6, 8)], chosen: 0, rootValue: 0.47 });

    expect(rating.quality).toBe("blunder");
    expect(rating.lossMargin).toBeLessThan(0.1);
    expect(rating.settled).toBe(true);
  });

  it("grades by the lower bound of the loss, not its mean", () => {
    const noisy = Array.from({ length: 8 }, (_, sample) => leaf(sample % 2 === 0 ? 0.25 : 0.55));
    const rating = rateReplayDecision({ samples: [noisy, spread(0.75, 8)], chosen: 0, rootValue: 0.5 });

    expect(rating.loss).toBeGreaterThan(0.3);
    expect(rating.quality).toBe("mistake");
  });

  it("blends and caps game-over rollouts toward the root estimate", () => {
    const rating = rateReplayDecision({
      samples: [
        [ending(0), leaf(0.5)],
        [ending(1), leaf(0.52)],
      ],
      chosen: 0,
      rootValue: 0.6,
    });

    expect(rating.values[0]).toBeCloseTo((0.18 + 0.5) / 2, 6);
    expect(rating.values[1]).toBeCloseTo((0.88 + 0.52) / 2, 6);
    expect(rateReplayDecision({ samples: [[ending(1)]], chosen: 0, rootValue: 0.99 }).values[0]).toBe(0.95);
  });

  it("calls the chosen option best when it leads, and good when the loss stays small", () => {
    expect(rateReplayDecision({ samples: [spread(0.6, 6), spread(0.4, 6)], chosen: 0, rootValue: 0.5 }).quality).toBe(
      "best",
    );
    const close = rateReplayDecision({
      samples: [spread(0.57, 12), spread(0.6, 12).map((sample, index) => leaf(sample!.reward + (index % 2) * 0.001))],
      chosen: 0,
      rootValue: 0.5,
    });
    expect(close.quality).toBe("good");
  });

  it("stops sampling options that are clearly worse than the leader", () => {
    const rating = rateReplayDecision({
      samples: [spread(0.5, 6), spread(0.7, 6), spread(0.1, 6), spread(0.66, 6)],
      chosen: 0,
      rootValue: 0.5,
    });

    expect(rating.active).toEqual([true, true, false, true]);
  });
});
