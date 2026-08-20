import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-042.js";

describe("BT23-042 Waspmon", () => {
  it("plays a Tamer containing Royal Base in its text from hand without paying", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-042", as: "wasp" }],
          hand: [{ card: "BT23-083", as: "fei" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const feiId = s.inst("fei").instanceId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wasp"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === feiId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === feiId)).toBe(true);
  });

  it("applies the inherited all-turns DP bonus to its carrier", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-046", as: "host", under: ["BT23-042"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(12000);
  });

  it("grants +1000 DP to all Royal Base Digimon in Security", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.isSecurity) as any;
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: "all",
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
    });
  });

  it("may play a Royal Base-in-text Tamer from hand when you have at most one Tamer", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any).actions[0];
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Royal Base"], match: "text" }] },
        count: 1,
      },
      from: ["hand"],
      payCost: false,
      condition: {
        kind: "permanentCount",
        op: "lte",
        value: 1,
        filter: { controllerDefault: "mine", kind: ["Tamer"] },
      },
      optional: true,
    });
  });

  it("inherits +1000 DP during all turns", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "permanent",
        },
      ],
    });
  });
});
