import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-032.js";
import "./BT26-032.js";

describe("BT26-032 compiled fidelity", () => {
  it("encodes Alliance/Succession, suspended-Digimon DP reduction, suspend-paid play/use, Option mode, and the explicit turn-gate seam", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.keywords?.map((keyword) => keyword.keyword)).toEqual(
      expect.arrayContaining(["Alliance", "Succession"]),
    );
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "ModifyDP", amount: -5000 },
      { kind: "Suspend" },
      {
        kind: "Modal",
        choose: 1,
        condition: { kind: "allOf", conditions: [{ kind: "ifThisEffectActed" }, { kind: "isYourTurn" }] },
      },
    ]);
    expect(card?.effects).toHaveLength(2);
    expect(card?.effects?.[1]?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "GrantStatic", grant: "trait", tokens: ["Vegetation"] }),
      ]),
    );
  });

  it("publicly reduces every suspended opposing Digimon by 5000 on digivolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-032", as: "ceresmon" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "suspended", suspended: true, dp: 11000 },
          { card: "BT1-010", as: "unsuspended", suspended: false, dp: 11000 },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ceresmon"));

    expect(s.perm("suspended").currentDP).toBe(6000);
    expect(s.perm("unsuspended").currentDP).toBe(11000);
  });
});
