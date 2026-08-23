import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-086.js";

describe("BT18-086 Lucemon: Larva", () => {
  it("covers security play, breeding replacement, and 0 DP protection", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Security", isSecurity: true });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isBreeding: true,
      actions: [{ kind: "Replacement", event: "wouldLeavePlay" }],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "Aura", effect: { kind: "restriction", restriction: "beDeleted" } }],
    });
  });

  it("plays a Lucemon from trash when revealed from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT18-086", as: "larva", faceUp: true }],
          trash: [{ card: "BT18-034", as: "lucemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("larva"));

    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("lucemon").instanceId),
    ).toBe(true);
  });
});
