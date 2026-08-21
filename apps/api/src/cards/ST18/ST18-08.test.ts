import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./ST18-08.js";

describe("ST18-08 Galemon", () => {
  it("publishes Vortex and the inherited +2000 DP clause", () => {
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Vortex" })],
    }));
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      isInherited: true,
      trigger: "YourTurn",
      actions: [expect.objectContaining({ kind: "ModifyDP", amount: 2000, duration: "permanent" })],
    }));
  });

  it("may play a LIBERATOR card costing four or less from hand when revealed in security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "ST18-08", as: "galemon", faceUp: true }], hand: [{ card: "ST18-14", as: "shoto" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("galemon"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-14"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-14")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST18-14")).toBe(false);
  });
});
