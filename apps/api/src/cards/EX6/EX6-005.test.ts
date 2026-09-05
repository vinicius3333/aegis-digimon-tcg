import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-005.js";

describe("EX6-005 Kakkinmon", () => {
  it("inherits a start-of-main-phase memory effect costing a Legend-Arms card from the stack", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      isInherited: true,
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "return",
            target: {
              count: 1,
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
                hostFilter: { isSelfRef: true },
                nameOrTrait: [{ match: "trait", tokens: ["Legend-Arms"] }],
              },
            },
          },
        },
      ],
    });
  });

  it("returns an eligible Legend-Arms source from its host and gains exactly 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX6-005", { card: "EX6-007", as: "legendArms" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("legendArms").instanceId);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX6-005"]);
  });

  it("can return a Legend-Arms card that is not a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["EX6-005", { card: "EX6-065", as: "legendArmsOption" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("legendArmsOption").instanceId,
    );
  });
});
