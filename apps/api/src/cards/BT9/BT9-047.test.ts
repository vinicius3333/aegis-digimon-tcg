import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-030.js";
import "./BT9-047.js";

describe("BT9-047 Pomumon", () => {
  it("prevents Digimon from being played by effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-030", as: "source", under: [{ card: "BT9-026", as: "material" }] }] }, 1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
