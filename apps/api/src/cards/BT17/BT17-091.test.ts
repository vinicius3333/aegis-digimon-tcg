import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-091.js";
import "./index.js";

describe("BT17-091 Cracker Fang", () => {
  it("models Security, start-of-turn memory, Mind Link, and the Rule name", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Mind Link" }],
      actions: [{ kind: "PlaceUnder", underFilter: { isSelfRef: true, condition: { noTamerInDigivolution: true } } }],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Eiji Nagasumi"] }],
    });
  });

  it("grants Alliance and Blocker only to the inherited host with Dark Animal or SoC", () => {
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          effect: { kind: "keyword", keyword: { keyword: "Alliance" } },
          while: { kind: "selfHasTrait" },
        },
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } }, while: { kind: "selfHasTrait" } },
      ],
    });
  });

  it("plays an Eiji Nagasumi from the digivolution cards at End of All Turns", () => {
    expect(compiled.effects?.[5]).toMatchObject({
      trigger: "EndOfAllTurns",
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
          target: { filter: { nameOrTrait: [{ tokens: ["Eiji Nagasumi", "Cracker Fang"], match: "name" }] } },
        },
      ],
    });
  });

  it("grants both inherited keywords and plays itself from the host at turn end", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-069", under: [{ card: "BT17-091", as: "crackerFang" }], as: "host" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const crackerFangId = s.inst("crackerFang").instanceId;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === crackerFangId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === crackerFangId)).toBe(
      true,
    );
  });
});
