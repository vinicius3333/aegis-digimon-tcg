import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-041.js";

describe("LM-041 Regalecusmon", () => {
  it("unsuspends a DS Digimon, returns security, and restricts an opposing permanent at 1 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-030", as: "ds", suspended: true }, { card: "LM-041", as: "regalecusmon" }] },
      1: { security: [{ card: "BT1-009" }], battleArea: [{ card: "BT1-085", as: "opponent" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 1;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("regalecusmon"));
    await settle(() => s.state.players[1]!.hand.length === 1 && !s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "EX12-030")!.isSuspended);

    expect(s.perm("ds").isSuspended).toBe(false);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    const opponent = s.state.players[1]!.battleArea[0];
    expect(opponent).toBeDefined();
    expect(observe(s.engine).isRestricted(opponent!, "beSuspended")).toBe(true);
  });
});
