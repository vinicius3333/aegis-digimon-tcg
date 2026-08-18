import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-072.js";

describe("BT12-072 Chaosdramon (X Antibody)", () => {
  it("places a Cyborg from trash at the bottom of its stack at start of main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-072", as: "chaos", under: ["BT1-009"] }],
          trash: [{ card: "BT1-021", as: "cyborg" }],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("chaos"));
    expect(s.perm("chaos").stack[0]?.cardId).toBe("BT1-021");
  });

  it("trashes the top opposing security when deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-072", as: "chaos" }] },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    await advance(s.engine).verb.deletePermanent([s.perm("chaos").permanentId]);
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
