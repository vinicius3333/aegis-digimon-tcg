import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-018.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-018 Gekomon", () => {
  it("draws one on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Draw", amount: 1 });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Draw", amount: 1 });
  });
  it("inherits Jamming", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming"));

  it("draws one card on play", async () => {
    const s = setupEngine({ 0: { deck: ["BT1-009"], battleArea: [{ card: "EX7-018", as: "geko" }] } });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("geko"));
    await settle(() => s.state.players[0].hand.length === 1);
    expect(s.state.players[0].hand[0]!.cardId).toBe("BT1-009");
  });
});
