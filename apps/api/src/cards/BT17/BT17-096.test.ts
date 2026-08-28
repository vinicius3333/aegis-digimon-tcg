import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-096.js";
import "./index.js";

describe("BT17-096 Crimson Savior", () => {
  it("keeps the Main play clause and exposes Gallantmon digivolution as Delay", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "PlayWithoutCost" }, { kind: "PlaceInBattleAreaSelf" }],
    });
    expect(compiled.effects?.[0]?.actions?.[1]).not.toHaveProperty("optional");
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          into: { nameOrTrait: [{ tokens: ["Gallantmon"], match: "name" }] },
        },
      ],
    });
  });

  it("grants Delay only when an opponent plays a level 5 or higher Digimon", () => {
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" }, duration: "permanent" }],
    });
  });

  it("activates the Main effect from Security", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });

  it("places itself in the battle area after declining the optional play", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT17-007"], hand: [{ card: "BT17-096", as: "option" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId)).toBe(true);
  });
});
