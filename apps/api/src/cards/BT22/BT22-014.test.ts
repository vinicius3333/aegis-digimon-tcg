import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-014.js";

describe("BT22-014 Gaiomon", () => {
  it("keeps Raid/Reboot, the optional unsuspend-then-attack, and target-switch reaction", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }] }),
    );
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions).toEqual([
      expect.objectContaining({
        kind: "Unsuspend",
        optional: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      }),
      expect.objectContaining({
        kind: "Attack",
        optional: true,
        withoutSuspending: false,
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      }),
    ]);
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttackTargetSwitched",
      actions: [
        expect.objectContaining({
          kind: "GainKeyword",
          keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
          duration: "forTheTurn",
        }),
        expect.objectContaining({ kind: "ModifyDP", amount: 5000, duration: "forTheTurn" }),
      ],
    });
  });
});
