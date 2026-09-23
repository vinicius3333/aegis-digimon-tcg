import { describe, expect, it } from "vitest";
import { runBotMatch } from "./matchHarness.js";

describe("bot match client projections", () => {
  it("keeps both client views private through a seeded real match", async () => {
    const result = await runBotMatch({
      seed: 20260922,
      seats: [{ profile: "balanced" }, { profile: "balanced" }],
      turnLimit: 2,
      verifyProjections: true,
      captureEvents: true,
    });

    expect(result.projectionChecks).toBeGreaterThan(1);
    expect(result.errors).toEqual([]);
    expect(result.events?.length).toBeGreaterThan(0);
  });
});
