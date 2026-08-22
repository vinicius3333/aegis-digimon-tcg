import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-087.js";
import "./index.js";

describe("BT17-087 Marcus Damon", () => {
  it("turns one Marcus Damon into a temporary 3000-DP Blocker that cannot digivolve", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "GrantStatic", grant: "kinds", tokens: ["Digimon"], duration: "untilOpponentTurnEnd" },
        { kind: "SetBaseDP", value: 3000, duration: "untilOpponentTurnEnd" },
        { kind: "Restrict", restriction: "digivolve", duration: "untilOpponentTurnEnd" },
        { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
      ],
    });
  });

  it("resolves both All Turns effects only when this Tamer suspends", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "ModifyDP", amount: 3000, duration: "forTheTurn" },
        { kind: "GainMemory", amount: 1, condition: { kind: "youHave" } },
      ],
    });
  });

  it("plays itself from Security without paying its cost", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }] });
  });

  it("becomes a Blocker and rewards its suspension with DP and memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-052", as: "agumon" }],
        hand: [{ card: "BT17-087", as: "marcus" }],
      },
    }, { autoSelectCards: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "play", instanceId: s.inst("marcus").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker"));
    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    await settle(() => s.state.memory === 1);

    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(s.perm("agumon").currentDP).toBe(5000);
    expect(s.state.memory).toBe(1);
  });
});
