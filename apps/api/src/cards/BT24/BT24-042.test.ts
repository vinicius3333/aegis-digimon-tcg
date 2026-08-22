import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_042 } from "./BT24-042.js";
import "../index.js";

function primitivesOf(setup: EngineSetup): Primitives {
  return (setup.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT24-042 Goblimon", () => {
  it("reduces Demon/Titan digivolution costs on your turn", () => {
    const replacement = BT24_042.effects?.find(
      (entry) => entry.trigger === "YourTurn" && entry.actions?.[0]?.kind === "Replacement",
    );
    expect(replacement?.actions?.[0]).toMatchObject({
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
      into: { nameOrTrait: [{ tokens: ["Demon", "Titan"], match: "trait" }] },
    });
  });
  it("keeps the inherited once-per-turn trash-triggered digivolution", () => {
    const inherited = BT24_042.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect((inherited?.actions?.[0] as any).event).toBe("whenHandTrashed");
    expect((inherited?.actions?.[0] as any).sourceFilter).toEqual({ controller: "mine" });
    expect((inherited?.actions?.[0] as any).actions[0].target).toMatchObject({
      filter: { isSelfRef: true },
      isSelf: true,
    });
  });

  it("uses exact Tsunomon and alternate TS egg routes", () => {
    expect(BT24_042.digivolutionRequirement).toEqual([
      { namesExact: ["Tsunomon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["TS"], cost: 0, isAlternate: true },
    ]);
  });

  it("reduces a Demon evolution by 1 in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-042", as: "goblimon" }],
        hand: [{ card: "BT24-045", as: "ogremon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("goblimon").permanentId,
        instanceId: s.inst("ogremon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("goblimon").topCard.instanceId === s.inst("ogremon").instanceId);
    expect(s.state.memory).toBe(4);
  });

  it("does not reduce the same evolution in breeding (Q5630)", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-042", as: "goblimon" },
        hand: [{ card: "BT24-045", as: "ogremon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("goblimon").permanentId,
        instanceId: s.inst("ogremon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("goblimon").topCard.instanceId === s.inst("ogremon").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("only inherited-evolves its own host after its owner's hand is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-072", as: "host", under: ["BT24-042"] },
            { card: "BT24-072", as: "other" },
          ],
          hand: [{ card: "BT1-001", as: "ownCost" }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
        1: { hand: [{ card: "BT1-002", as: "opponentCost" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await primitivesOf(s).trash([s.inst("opponentCost").instanceId], { byEffectSeat: 1 });
    expect(s.perm("host").topCard.cardId).toBe("BT24-072");
    await primitivesOf(s).trash([s.inst("ownCost").instanceId], { byEffectSeat: 0 });
    await settle(() => s.perm("host").topCard.cardId === "P-209");

    expect(s.perm("other").topCard.cardId).toBe("BT24-072");
    expect(s.state.memory).toBe(8);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(true);
  });
});
