import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-072.js";
import "../index.js";

describe("EX5-072 Holy Beasts Great Cardinal Positions", () => {
  it("queues the paid Option reduction once per distinct qualifying trash name", () => {
    const reduction = compiled.effects
      ?.find((entry) => entry.trigger === "BeforePayCost")
      ?.actions?.find((action) => action.kind === "ReducePlayCost");
    expect(reduction).toMatchObject({ kind: "ReducePlayCost", amount: { kind: "fixed", value: 1 } });
  });
  it("keeps the Use Requirement waiver in its own executable Static clause", () => {
    expect(compiled.effects.filter((entry) => entry.trigger === "Static")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ actions: [expect.objectContaining({ kind: "WaiveColorRequirement" })] }),
      ]),
    );
  });
  it("reduces its use cost per unique Deva/Four Sovereigns trash name and can play Fanglongmon", () => {
    expect(
      compiled.effects
        ?.find((entry) => entry.trigger === "BeforePayCost")
        ?.actions.find((action) => action.kind === "ReducePlayCost"),
    ).toMatchObject({
      kind: "ReducePlayCost",
      scaling: {
        per: 1,
        unit: "trash",
        filter: {
          controller: "mine",
          zone: "trash",
          distinctNames: true,
          excludeSelf: true,
          nameOrTrait: [{ match: "trait", tokens: ["Deva", "Four Sovereigns"] }],
        },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        count: 1,
        upTo: true,
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Fanglongmon"] }] },
      },
    });
  });
  it("returns any Fanglongmon-name card from trash and adds itself from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([
      {
        kind: "Return",
        to: "hand",
        target: {
          count: 1,
          filter: {
            zone: "trash",
            controller: "mine",
            nameOrTrait: [{ match: "name", tokens: ["Fanglongmon"] }],
          },
        },
      },
      { kind: "AddToHandSelf" },
    ]));

  it("pays the Option cost reduced once per distinct Deva/Four Sovereigns trash name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-029", as: "waiver" }],
          hand: [
            { card: "EX5-072", as: "option" },
            { card: "EX5-074", as: "fanglongmon" },
          ],
          trash: ["BT10-079", "BT6-029", "BT10-079"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX5-074"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX5-074")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("applies the trash-name reduction without requiring the separate waiver Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-095", as: "whiteTamer" }],
          hand: [
            { card: "EX5-072", as: "option" },
            { card: "EX5-074", as: "fanglongmon" },
          ],
          trash: ["BT10-079", "BT6-029", "BT10-079"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 12;
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionInstanceId));

    expect(s.state.memory).toBe(2);
  });

  it("declines the optional Main play when no Fanglongmon-name Digimon is in hand", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT6-029", as: "waiver" }], hand: [{ card: "EX5-072", as: "option" }, "BT1-009"] } },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
  });

  it("resolves the Security return and adds the Option to hand through public timing", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "EX5-072", as: "securityOption" }],
        trash: [{ card: "EX5-074", as: "trashFanglongmon" }],
      },
    });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX5-074"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX5-074", "EX5-072"]));
  });
});
