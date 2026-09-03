import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT12-091.js";
import "./BT12-109.js";

describe("BT12-109 Overflowing Power", () => {
  it("registers its printed Security add-to-hand effect", () => {
    const module = getEffectModule("BT12-109");
    const source = { instanceId: "source-109", cardId: "BT12-109", ownerSeat: 0, isOnBattleArea: () => false } as never;
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("registers a typed Main waiver followed by a Save-text under-Tamer digivolution", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const main = runtimeCompiledCard("BT12-109")!.effects.find((effect) => effect.trigger === "Main");
    const staticEffect = runtimeCompiledCard("BT12-109")!.effects.find((effect) => effect.trigger === "Static");
    expect(staticEffect?.actions).toEqual([expect.objectContaining({ kind: "WaiveColorRequirement" })]);
    expect(main?.actions.map((action) => action.kind)).toEqual(["Digivolve"]);
    expect(main?.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["underTamers"],
      payCost: true,
      into: { zone: "underTamers", nameOrTrait: [{ tokens: ["Save"], match: "text" }] },
    });
  });

  it("does not reuse the imminent evolution card as the Hunter Tamer reducer's placement cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-008", as: "base" },
            { card: "BT12-091", as: "hunter", under: [{ card: "BT12-077", as: "saved" }] },
          ],
          hand: [{ card: "BT12-109", as: "option" }],
        },
      },
      {
        autoSelectCards: true,
        autoOrderTriggers: true,
      },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.perm("base").topCard.instanceId === s.inst("saved").instanceId &&
        s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT12-109"),
    );

    expect(s.perm("base").topCard.cardId).toBe("BT12-077");
    expect(s.perm("hunter").stack).toHaveLength(0);
    expect(s.perm("hunter").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT12-109");
    expect(s.state.memory).toBe(0); // BT12-077's printed digivolution cost is 2
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("pays a Hunter Tamer reducer with a separate under-Tamer card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-008", as: "base" },
            {
              card: "BT12-091",
              as: "hunter",
              under: [
                { card: "BT1-009", as: "placed-cost" },
                { card: "BT12-077", as: "saved" },
              ],
            },
          ],
          hand: [{ card: "BT12-109", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("base").topCard.instanceId === s.inst("saved").instanceId &&
        s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT12-109"),
    );

    expect(s.perm("hunter").isSuspended).toBe(true);
    expect(s.perm("hunter").stack).toHaveLength(0);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("placed-cost").instanceId);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not waive the color requirement without a Hunter Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-008", as: "base" },
          { card: "BT1-085", as: "tamer", under: [{ card: "BT12-011", as: "saved" }] },
        ],
        hand: [{ card: "BT12-109", as: "option" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
    expect(s.perm("base").topCard.cardId).toBe("BT12-008");
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toEqual(["BT12-011"]);
  });

  it("does not consume an unrelated card under a Hunter Tamer when no Save card is available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-074", as: "base" },
            { card: "BT12-091", as: "hunter", under: [{ card: "BT1-009", as: "notSave" }] },
          ],
          hand: [{ card: "BT12-109", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("option").instanceId));
    expect(s.perm("base").topCard.cardId).toBe("BT12-074");
    expect(s.perm("hunter").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("notSave").instanceId]);
  });

  it("adds itself to its owner's hand from Security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT12-109", as: "option", faceUp: true }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("option").instanceId);
  });
});
