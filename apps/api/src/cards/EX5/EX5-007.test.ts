import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-007.js";
import "../index.js";

describe("EX5-007 Coronamon", () => {
  it("gains memory at the start of the main phase with a Light Fang or Night Claw Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Tamer"],
          nameOrTrait: [{ match: "trait", tokens: ["Light Fang", "Night Claw"] }],
        },
      },
    });
  });
  it("once per turn gains two memory by moving its traited top card to the bottom of its stack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                isSelfRef: true,
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Light Fang", "Night Claw"], match: "trait" }],
              },
              count: 1,
              isSelf: true,
            },
            raw: "By placing the top card of this Digimon with the [Light Fang]/[Night Claw] trait as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
        },
      ],
    });
  });

  it("gains memory from a matching Tamer and moves a traited top card only when eligible", async () => {
    const withTamer = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-007", as: "source" },
          { card: "EX5-065", as: "tamer" },
        ],
      },
    });
    await withTamer.ready();
    withTamer.state.memory = 0;
    await advance(withTamer.engine).fire(EffectTiming.StartOfYourMainPhase, withTamer.perm("source"));
    expect(withTamer.state.memory).toBe(1);

    const moved = setupEngine(
      { 0: { battleArea: [{ card: "EX5-008", as: "host", under: ["EX5-007"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await moved.ready();
    moved.state.memory = 0;
    const movedEffect = JSON.parse(moved.perm("host").activatableEffectsJson || "[]").find(
      (entry: { effectKey: string; description?: string }) => /Gain 2 memory/i.test(entry.description ?? ""),
    );
    expect(movedEffect).toBeDefined();
    expect(
      moved.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: movedEffect.instanceId,
        effectKey: movedEffect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => moved.state.memory === 2 && moved.perm("host").topCard?.cardId === "EX5-007", 500);
    expect(moved.state.memory).toBe(2);
    expect(moved.perm("host").topCard?.cardId).toBe("EX5-007");
    expect(moved.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-008"]);

    const notMoved = setupEngine(
      { 0: { battleArea: [{ card: "EX5-010", as: "host", under: ["EX5-007"] }] } },
      { autoAcceptOptional: true },
    );
    await notMoved.ready();
    notMoved.state.memory = 0;
    const notMovedEffect = JSON.parse(notMoved.perm("host").activatableEffectsJson || "[]").find(
      (entry: { effectKey: string; description?: string }) => /Gain 2 memory/i.test(entry.description ?? ""),
    );
    expect(notMovedEffect).toBeDefined();
    expect(
      notMoved.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: notMovedEffect.instanceId,
        effectKey: notMovedEffect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);
    expect(notMoved.state.memory).toBe(0);
    expect(notMoved.perm("host").topCard?.cardId).toBe("EX5-010");
  });
});
