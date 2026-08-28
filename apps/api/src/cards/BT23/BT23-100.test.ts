import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-100.js";

describe("BT23-100 Hudie Net CafxE9", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-100")).toMatchObject({
      cardId: "BT23-100",
      nameEn: "Hudie Net CafxE9",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 3,
      types: ["Hudie", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("free-plays an exact level-3 CS from hand and places itself from Security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT23-100", as: "option", faceUp: true }], hand: [{ card: "BT23-006", as: "cs" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const csId = s.inst("cs").instanceId;
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === csId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });

  it("waives color requirements for a CS Digimon or Tamer in either field area", () => {
    const waive = compiled.effects.find((effect) => effect.trigger === "Static")?.actions?.[0] as any;
    expect(waive).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHave",
        filter: { kind: ["Digimon", "Tamer"], zone: ["battleArea", "breedingArea"] },
      },
    });
  });

  it("draws then places itself, and models the Delay Tamer play", () => {
    const main = compiled.effects.find(
      (effect) => effect.trigger === "Main" && effect.actions?.[0]?.kind === "Draw",
    ) as any;
    const delay = compiled.effects.find(
      (effect) => effect.trigger === "Main" && effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
    ) as any;
    expect(main.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }]);
    expect(delay.keywords[0].keyword).toBe("Delay");
    expect(delay.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], optional: true });
  });

  it("requires placing itself after the optional Security play", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(security.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true });
    expect(security.actions[0].target.filter).toMatchObject({ kind: ["Digimon"], levels: [3] });
    expect(security.actions[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
    expect(security.actions[1].optional).toBeUndefined();
  });
});
