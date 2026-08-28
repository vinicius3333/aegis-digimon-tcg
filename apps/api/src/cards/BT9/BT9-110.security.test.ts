import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-110.js";

describe("BT9-110 X Program — Security", () => {
  it("deletes an opposing Digimon without the X Antibody trait", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT9-110", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
