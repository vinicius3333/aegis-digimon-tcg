import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-005.js";

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("EX8-005", () => {
  it("inherits gaining 1 memory when discarded from a Mineral or Rock host", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDigivolutionCardsDiscardedBatch",
      sourceFilter: { isSelfRef: true },
      hostFilter: { nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
      actions: [{ kind: "GainMemory", amount: 1 }],
    }));

  it("gains memory when this card is trashed from a qualifying host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-055", as: "host", under: [{ card: "EX8-005", as: "discarded" }, "EX8-046"] }] },
    });
    await s.ready();
    s.state.memory = 0;
    await primitivesOf(s).trashDigivolutionCards(s.perm("host").permanentId, [s.inst("discarded").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when this card is trashed from a non-Mineral/Rock host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", under: [{ card: "EX8-005", as: "discarded" }] }] },
    });
    await s.ready();
    s.state.memory = 0;
    await primitivesOf(s).trashDigivolutionCards(s.perm("host").permanentId, [s.inst("discarded").instanceId], {
      byEffectSeat: 0,
    });
    expect(s.state.memory).toBe(0);
  });
});
