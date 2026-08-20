import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-055.js";

describe("BT16-055", () => {
  it("protects one of your Digimon from DP reduction and de-digivolution", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "GrantStatic", grant: { kind: "Protection", protections: ["dpReduction", "deDigivolve"] }, duration: "untilOpponentTurnEnd", condition: { kind: "securityAtLeast", value: 3 } });
    }
  });

  it("grants Blocker and Reboot when security is three or fewer", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[1]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Blocker" }, condition: { kind: "youHave" } });
      expect(effect.actions?.[2]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Reboot" }, condition: { kind: "youHave" } });
    }
  });

  it("has inherited Pulsemon conditional DP", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfTopHasText" } }] });
  });
});
