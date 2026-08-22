import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-098.js";

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
          nameOrTrait: [{ match: "name", tokens: ["Kudamon"] }],
        },
        count: 1,
      },
      ignoreRequirements: true,
      from: ["hand"],
      into: { nameOrTrait: [{ match: "name", tokens: ["Kentaurosmon"] }] },
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
});
