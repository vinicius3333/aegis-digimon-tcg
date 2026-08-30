import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-098.js";

function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = (s.engine as any).cardSourceOf(s.perm("richard").topCard!);
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT13-098/"))!
    .effectKey;
}

describe("BT13-098 Richard Sampson", () => {
  it("plays itself when an effect directly trashes it from security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDiscardSecurity")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          payCost: false,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
    });
  });

  it("uses the total security count for both memory and Main conditions", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "totalSecurityCount",
        op: "lte",
        value: 6,
        raw: "there're 6 or fewer total cards in both players' security stacks",
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      target: {
        filter: {
          controller: "mine",
          zone: "battleArea",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "nameExact", tokens: ["Kudamon"] }],
        },
        count: 1,
      },
      ignoreRequirements: true,
      from: ["hand"],
      into: { nameOrTrait: [{ match: "nameExact", tokens: ["Kentaurosmon"] }] },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
      condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it("gains memory at the start of the main phase when total security is six or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-098", as: "richard" }] } });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("richard"));
    expect(s.state.memory).toBe(1);
  });

  it("plays itself from security when an effect directly trashes it", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT13-098", as: "richard", faceUp: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.trash([s.inst("richard").instanceId]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("richard").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("richard").instanceId)).toBe(false);
  });

  it("digivolves an exact Kudamon into an exact Kentaurosmon from hand by suspending this Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-098", as: "richard" }, { card: "BT1-046", as: "kudamon" }],
          hand: [{ card: "BT13-046", as: "kentaurosmon" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { security: ["BT1-004", "BT1-005", "BT1-006"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("richard").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kudamon").topCard.cardId === "BT13-046");
    expect(s.perm("richard").isSuspended).toBe(true);
    expect(s.perm("kudamon").topCard.cardId).toBe("BT13-046");
  });
});
