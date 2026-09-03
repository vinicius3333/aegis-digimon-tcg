import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-093.js";
import "../index.js";

describe("BT16-093", () => {
  it("waives color requirements when you have a green Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave" } }],
    });
  });

  it("digivolves into Rapidmon from hand and prevents DP reduction", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          ignoreRequirements: true,
          optional: true,
          bindResultAs: "bt16093Rapidmon",
        },
        {
          kind: "Restrict",
          restriction: "dpImmune",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
          target: { filter: { boundRef: "bt16093Rapidmon" } },
        },
      ],
    });
  });

  it("plays Terriermon from hand/trash and returns itself from security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "AddToHandSelf" },
      ],
    });
  });

  it("evolves a Gargomon into a hand Rapidmon and blocks opponent DP reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-048", as: "gargomon" }],
          hand: [
            { card: "BT16-093", as: "option" },
            { card: "BT8-039", as: "rapidmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gargomon").topCard?.cardId === "BT8-039");

    const before = s.perm("gargomon").currentDP;
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.modifyDP(s.perm("gargomon").permanentId, -2000, EffectDuration.UntilOpponentTurnEnd);
    driver.verb.leaveEffectResolution();

    expect(s.perm("gargomon").topCard?.cardId).toBe("BT8-039");
    expect(s.perm("gargomon").currentDP).toBe(before);

    driver.verb.enterEffectResolution(0, ["Digimon"]);
    await driver.verb.modifyDP(s.perm("gargomon").permanentId, -2000, EffectDuration.UntilOpponentTurnEnd);
    driver.verb.leaveEffectResolution();
    expect(s.perm("gargomon").currentDP).toBe(before - 2000);
  });
});
