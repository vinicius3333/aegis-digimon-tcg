import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-005.js";
describe("EX7-005 Kapurimon", () =>
  it("inherits a once-per-turn Three Musketeers Option watcher", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: {
            kind: ["Option"],
            nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
          },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    })));
