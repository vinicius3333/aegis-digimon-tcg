import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-023.js";

describe("BT17-023", () => {
  it("can digivolve onto a yellow Tamer as level 3 and has Draw 1", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "Digivolve", asLevel: 3 }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", keywords: [{ keyword: "Draw", amount: 1 }] });
  });

  it("may digivolve while attacking into a Hybrid for 1 less", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "Digivolve", from: ["hand"], costDelta: -1, optional: true }] });
  });

  it("draws while attacking with 7 or fewer cards in hand as inherited", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", value: 7 } }] });
  });

  it("draws from the attack trigger", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-023", as: "kendo" }], deck: ["BT1-009"] } }, { autoDeclineOptional: true });
    const before = s.state.players[0]!.hand.length;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("kendo"));
    expect(s.state.players[0]!.hand).toHaveLength(before + 1);
  });
});
