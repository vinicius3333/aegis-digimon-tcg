import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-048.js";

describe("EX4-048 Gaiomon", () => {
  it("is also treated as Greymon and deletes an opposing Digimon costing at least thirteen", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({ kind: "GrantStatic", grant: "name", tokens: ["Greymon"] });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Delete", target: { filter: { costComparison: { op: "gte", value: 13 } } } });
  });
  it("trashes security when no Digimon was deleted and can free-digivolve with a Tamer", () => {
    const effects = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(effects?.[1]).toMatchObject({ kind: "SecurityManipulation", op: "trashTop", condition: { kind: "ifThisEffectDidNotDelete" } });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], payCost: false, ignoreRequirements: true, condition: { kind: "youHave" } });
  });

  it("deletes an opposing Digimon with play cost thirteen or more", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX4-048", as: "source" }] }, 1: { battleArea: [{ card: "EX4-074", as: "target" }] } }, { autoSelectCards: true });
    const targetInstanceId = s.perm("target").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });
});
