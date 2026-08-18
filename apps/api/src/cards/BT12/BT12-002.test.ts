import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-002.js";

describe("BT12-002 DemiVeemon", () => {
  it("draws when its host attacks while its controller has a green Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-002"] }, "BT12-047"], deck: ["BT1-010"] } });
    const before = s.state.players[0]!.deck.length;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.deck.length === before - 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
