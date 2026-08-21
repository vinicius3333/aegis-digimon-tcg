import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-007.js";

describe("BT14-007", () => {
  it("may free-digivolve into a Greymon with Tai Kamiya at the start of main phase", () => expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({ actions: [{ kind: "Digivolve", payCost: false, from: ["hand"], condition: { kind: "youHave" }, into: { nameOrTrait: [{ tokens: ["Greymon"], match: "name" }] } }] }));
  it("inherits +2000 DP for Greymon or Omnimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 2000 }, while: { kind: "selfHasNameContaining" } }] }));

  it("free-digivolves into a Greymon when Tai Kamiya is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-007", as: "agumon" }, { card: "BT1-085", as: "tai" }],
          hand: [{ card: "BT1-015", as: "greymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    const agumon = s.perm("agumon");
    await advance(s.engine).runTurn(0);
    await settle(() => agumon.topCard?.cardId === "BT1-015");
    expect(agumon.topCard?.cardId).toBe("BT1-015");
    expect(agumon.stack.some((card) => card.cardId === "BT14-007")).toBe(true);
  });
});
