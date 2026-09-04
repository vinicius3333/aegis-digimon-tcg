import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-005.js";
describe("EX7-005 Kapurimon", () => {
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
    }));

  it("publicly gains memory when an effect places a Three Musketeers Option under its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-005"] }],
        hand: [{ card: "EX7-066", as: "option" }],
      },
    });
    await s.ready();
    s.state.memory = 2;

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("option").instanceId]);

    expect(s.state.memory).toBe(3);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
