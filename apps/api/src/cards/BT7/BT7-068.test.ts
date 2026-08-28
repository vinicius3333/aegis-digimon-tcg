import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-068.js";

describe("BT7-068 Lopmon", () => {
  it("records the inherited once-per-turn Tamer watcher", () => {
    expect(runtimeCompiledCard("BT7-068")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { kind: ["Tamer"] }, actions: [{ kind: "GainMemory", amount: 1 }] }],
        },
      ],
    });
  });

  it("gains 1 memory when its owner plays a Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-075", under: ["BT7-068"], as: "host" }],
        hand: [{ card: "BT7-090", as: "tamer" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("tamer").instanceId]);
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });
});
