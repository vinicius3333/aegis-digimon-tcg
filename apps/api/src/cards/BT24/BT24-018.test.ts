import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-018.js";

describe("BT24-018 Styracomon", () => {
  it("trashes an opponent security card and may unsuspend on digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "Trash",
      optional: true,
      target: { filter: { controller: "opponent", zone: "security" } },
    });
    expect(effect.actions[1]).toMatchObject({ kind: "Unsuspend", optional: true });
  });

  it("uses an executable lowest-DP opponent deletion cost for leave prevention", () => {
    const replacement = compiled.effects.find(
      (entry) => entry.trigger === "AllTurns" && entry.actions?.[0]?.kind === "Replacement",
    )?.actions?.[0] as any;
    expect(replacement).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay" });
    expect(replacement.cost).toMatchObject({
      kind: "deleteOwn",
      target: { filter: { controller: "opponent", superlative: "lowestDP" } },
    });
  });
});
