import { describe, expect, it } from "vitest";
import { CardKind, type CardDefinition } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { compiled } from "./BT17-014.js";

describe("BT17-014", () => {
  it("digivolves a Takuya Kanbara into itself for 3 by placing Agunimon and BurningGreymon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      actions: [
        { kind: "Digivolve", costOverride: 3, asLevel: 4, asColors: ["Red"], additionalCosts: [{ kind: "place" }] },
      ],
    });
    expect(compiled.effects?.[0]?.actions?.[0]).not.toHaveProperty("ignoreRequirements");
  });

  it("deletes an opposing Digimon at 6000 DP or less", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 6000 } } } }],
    });
  });

  it("prevents security option effects as inherited for Hybrid or Ten Warriors", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "GrantStatic",
          grant: "noSecurityOptionEffects",
          duration: "permanent",
          condition: { kind: "selfHasTrait" },
        },
      ],
    });
  });

  it("disables security Option effects for a Hybrid host on its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-011", as: "host", under: ["BT17-014"] }] } });
    const option = {
      cardId: "TEST-OPTION",
      nameEn: "Test Option",
      kinds: [CardKind.Option],
      colors: [],
      types: [],
      playCost: 1,
      level: undefined,
      dp: undefined,
      digivolveRequirement: [],
    } as unknown as CardDefinition;
    await s.ready();
    const ledger = (s.engine as unknown as { continuous: ContinuousEffectLedger }).continuous;
    expect(ledger.isSecurityEffectDisabled(s.perm("host").permanentId, option)).toBe(true);
  });
});
