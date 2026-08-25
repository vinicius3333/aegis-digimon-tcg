import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-099.js";

describe("BT23-099 Sistermon Sisters Training Gym", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-099")).toMatchObject({
      cardId: "BT23-099",
      nameEn: "The Sistermon Sisters Training Gym",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 2,
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("pays Delay on a Huckmon evolution and free-plays Sistermon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-099", as: "option" },
            { card: "ST12-04", as: "huckmon" },
          ],
          hand: [{ card: "BT23-076", as: "sistermon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    const sistermonId = s.inst("sistermon").instanceId;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("huckmon").permanentId,
    });
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === sistermonId)).toBe(
      true,
    );
  });

  it("grants color waiving with Huckmon on the field and places itself after drawing", () => {
    const waive = compiled.effects[0]?.actions?.[0] as any;
    expect(waive.condition.filter.zone).toEqual(["battleArea", "breedingArea"]);
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && !effect.keywords) as any;
    expect(main.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }]);
  });

  it("activates Delay on Huckmon/Jesmon digivolution with the printed Sistermon play payload", () => {
    const arm = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(arm.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" });
    expect(arm.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(arm.actions[0].actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      optional: true,
    });
  });

  it("keeps the Security play optional but places the option in battle mandatorily", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(security.actions[0]).toMatchObject({ kind: "PlayWithoutCost", optional: true });
    expect(security.actions[1]).toEqual({ kind: "PlaceInBattleAreaSelf" });
  });
});
