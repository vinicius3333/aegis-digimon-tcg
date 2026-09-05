import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-213.js";

describe("P-213 Aegiochusmon", () => {
  it("has Raid, Decode, and the Aegiomon digivolution requirement", () => {
    const card = runtimeCompiledCard("P-213")!;
    expect(card.digivolutionRequirement).toEqual([{ names: ["Aegiomon"], cost: 3, isAlternate: true }]);
    expect(card.effects.filter((effect) => effect.trigger === "Static").map((effect) => effect.keywords)).toEqual([
      [{ keyword: "Raid", raw: "＜Raid＞" }],
      [{ keyword: "Decode", raw: "＜Decode ([Aegiomon])＞" }],
      [{ keyword: "Decode", raw: "＜Decode ([Aegiomon])＞" }],
    ]);
  });

  it("gains Rush and 3000 DP at three or fewer security, then may attack", () => {
    expect(runtimeCompiledCard("P-213")!.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Rush", raw: "＜Rush＞" },
          duration: "untilOpponentTurnEnd",
          target: { count: 1, isSelf: true },
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
        },
        {
          kind: "ModifyDP",
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          target: { count: 1, isSelf: true },
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
        },
        { kind: "Attack", optional: true, withoutSuspending: false, target: { count: 1, isSelf: true } },
      ],
    });
  });
});
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-213 engine behavior", () => {
  it("grants Rush and +3000 DP at three security, but not at four", async () => {
    const s = setupEngine(
      { 0: { security: 3, battleArea: [{ card: "P-213", as: "aegiomon" }] } },
      { autoDeclineOptional: true },
    );
    const base = s.perm("aegiomon").currentDP;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("aegiomon"));
    await settle();
    expect(s.perm("aegiomon").currentDP).toBe(base + 3000);
    const high = setupEngine(
      { 0: { security: 4, battleArea: [{ card: "P-213", as: "aegiomon" }] } },
      { autoDeclineOptional: true },
    );
    const highBase = high.perm("aegiomon").currentDP;
    await high.ready();
    await advance(high.engine).fire(EffectTiming.WhenDigivolving, high.perm("aegiomon"));
    await settle();
    expect(high.perm("aegiomon").currentDP).toBe(highBase);
  });

  it("still permits the optional attack when the three-security bonus condition is false", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-213", as: "aegiomon" }], security: 4 },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const base = s.perm("aegiomon").currentDP;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("aegiomon"));
    await settle();
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("aegiomon").currentDP).toBe(base);
  });
});
