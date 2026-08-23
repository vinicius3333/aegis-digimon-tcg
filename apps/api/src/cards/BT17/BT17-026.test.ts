import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-026.js";

describe("BT17-026", () => {
  it("digivolves a Koji Tamer by placing Lobomon and KendoGarurumon from trash for cost 3", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { nameOrTrait: [{ tokens: ["Koji Minamoto"], match: "name" }] } },
          costOverride: 3,
          asLevel: 4,
          asColors: ["Blue"],
          additionalCosts: [{ kind: "place" }],
        },
      ],
    });
    expect(compiled.effects?.[0]?.actions?.[0]).not.toHaveProperty("ignoreRequirements");
  });

  it("returns a Hybrid card from its stack to suspend an opposing Digimon or Tamer", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "return" },
        },
      ],
    });
  });

  it("returns a level 4 or lower opponent as inherited when it has Hybrid or Ten Warriors", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Return", to: "hand", condition: { kind: "selfHasTrait" } }],
    });
  });

  it("returns an opposing level 4 Digimon when its Hybrid host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-023", as: "host", under: ["BT17-026"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    const targetInstanceId = s.perm("target").topCard!.instanceId;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });
});
