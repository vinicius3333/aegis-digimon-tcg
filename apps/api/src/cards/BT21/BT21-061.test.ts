import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-061.js";

describe("BT21-061 MetalGreymon", () => {
  it("keeps the conditional Alliance and optional attack inside each trigger", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");

    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions).toHaveLength(2);
    for (const action of effect?.actions ?? []) {
      const nested = action as { event?: string; actions?: unknown[] };
      expect(["whenPlayed", "whenOneOfYoursDigivolves"]).toContain(nested.event);
      expect(nested.actions).toHaveLength(2);
      expect(nested.actions?.[0]).toMatchObject({
        kind: "GainKeyword",
        target: { sourceRef: "triggerSubject" },
        keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
        duration: "forTheTurn",
        condition: { kind: "triggerSubjectMatchesFilter" },
      });
      expect(nested.actions?.[1]).toMatchObject({ kind: "Attack", optional: true, withoutSuspending: false, target: { sourceRef: "triggerSubject" } });
    }
  });
});
