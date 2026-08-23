import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-095.js";
import "./index.js";

describe("BT17-095 Miraculous Mega Knight", () => {
  it("keeps the Main play clause separate from the Omnimon Delay DNA effect", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "PlayWithoutCost" }, { kind: "PlaceInBattleAreaSelf" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "DnaDigivolve",
          payCost: false,
          materials: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
          looseMaterials: { count: 1, from: ["hand"], filter: { zone: "hand", controller: "mine", kind: ["Digimon"] } },
          into: { nameOrTrait: [{ tokens: ["Omnimon"], match: "name" }] },
        },
      ],
    });
    expect(compiled.effects?.[0]?.actions?.[1]).not.toHaveProperty("optional");
  });

  it("grants Delay only for an owned level 6 Greymon or Garurumon leaving outside battle", () => {
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanBattle",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        levels: [6],
        nameOrTrait: [{ tokens: ["Greymon", "Garurumon"], match: "name" }],
      },
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" } }],
    });
  });

  it("adds itself to hand after the Security Tamer play option", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost" }, { kind: "AddToHandSelf" }],
    });
  });

  it("places itself in the battle area when the optional Digimon play is declined", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT17-007", "BT17-019"], hand: [{ card: "BT17-095", as: "option" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId)).toBe(true);
  });
});
