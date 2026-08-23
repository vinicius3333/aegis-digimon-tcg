import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-019.js";
import "../index.js";

describe("BT24-019 Kamemon", () => {
  it("reduces this Digimon's blue TS digivolution cost during your turn", () => {
    const replacement = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions?.[0] as any;
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
    });
    expect(replacement.into).toMatchObject({ colors: ["Blue"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] });
    expect(replacement.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      mode: "reduceCost",
      amount: 1,
    });
  });

  it("retains inherited Jamming", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming");
  });

  it("reduces a blue TS evolution from cost 2 to 1 in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-019", as: "kamemon" }],
        hand: [{ card: "BT24-022", as: "ikkakumon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kamemon").permanentId,
        instanceId: s.inst("ikkakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kamemon").topCard.instanceId === s.inst("ikkakumon").instanceId);

    expect(s.state.memory).toBe(4);
  });

  it("does not reduce the same evolution in the breeding area (Q5601)", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-019", as: "kamemon" },
        hand: [{ card: "BT24-022", as: "ikkakumon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kamemon").permanentId,
        instanceId: s.inst("ikkakumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kamemon").topCard.instanceId === s.inst("ikkakumon").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("digivolves from a non-blue level 2 TS Digi-Egg for cost 0 and grants inherited Jamming", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-003", as: "tsEgg" },
        hand: [{ card: "BT24-019", as: "kamemon" }],
        battleArea: [{ card: "BT24-022", as: "host", under: ["BT24-019"] }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsEgg").permanentId,
        instanceId: s.inst("kamemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsEgg").topCard.instanceId === s.inst("kamemon").instanceId);

    expect(s.state.memory).toBe(5);
  });
});
