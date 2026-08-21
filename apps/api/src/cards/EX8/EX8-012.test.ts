import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX8-012.js";

describe("EX8-012", () => {
  const source = {
    instanceId: "source",
    cardId: "EX8-012",
    ownerSeat: 0,
    definition: {},
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  } as never;
  it("registers the draw/trash digivolving effect", () =>
    expect(getEffectModule("EX8-012")!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1));
  it("registers the once-per-turn inherited opponent-deletion memory effect", () =>
    expect(getEffectModule("EX8-012")!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)[0]?.maxPerTurn).toBe(
      1,
    ));
  it("keeps the conditional Guilmon recovery branch attached to digivolution", () => {
    const effect = getEffectModule("EX8-012")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    expect(effect.description).toContain("Draw 1");
    expect(effect.resolve).toBeTypeOf("function");
  });

  it("gains 1 memory when an opposing Digimon is deleted during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-012", as: "growlmon" }] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("opponent").permanentId], "byEffect");
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});
