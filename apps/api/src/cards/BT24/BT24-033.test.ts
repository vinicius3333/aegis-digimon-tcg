import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_033 } from "./BT24-033.js";
import "../index.js";

describe("BT24-033 Salamon", () => {
  it("reduces your-turn Iliad digivolution costs by one", () => {
    const effect = BT24_033.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(effect?.actions?.[0]).toMatchObject({
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
      into: { nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] },
      actions: [{ mode: "reduceCost", amount: 1 }],
    });
    expect(BT24_033.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Barrier");
  });

  it("reduces an Iliad evolution in the battle area by 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-033", as: "salamon" }],
        hand: [{ card: "BT24-034", as: "aegiomon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("salamon").permanentId,
        instanceId: s.inst("aegiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("salamon").topCard.instanceId === s.inst("aegiomon").instanceId);

    expect(s.state.memory).toBe(4);
  });

  it("does not reduce the same Iliad evolution in breeding (Q5612)", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-033", as: "salamon" },
        hand: [{ card: "BT24-034", as: "aegiomon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("salamon").permanentId,
        instanceId: s.inst("aegiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("salamon").topCard.instanceId === s.inst("aegiomon").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("grants inherited Barrier and evolves from a non-yellow level-2 TS egg for 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-034", as: "host", under: ["BT24-033"] }],
        breeding: { card: "BT24-001", as: "egg" },
        hand: [{ card: "BT24-033", as: "salamon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("salamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("salamon").instanceId);
    expect(s.state.memory).toBe(3);
  });
});
