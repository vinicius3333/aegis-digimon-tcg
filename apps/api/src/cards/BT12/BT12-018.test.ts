import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-018.js";

describe("BT12-018 Gallantmon", () => {
  it("has Raid as a static keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-018", as: "gallant" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gallant"), "Raid")).toBe(true);
  });

  it("deletes one opposing Digimon at the inclusive 6000 DP boundary when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-018", as: "gallant" }] },
        1: {
          battleArea: [
            { card: "BT12-021", as: "eligible", dp: 6000 },
            { card: "BT12-021", as: "tooLarge", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gallant"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("tooLarge").permanentId);
  });

  it("deletes a 6000 DP Digimon when attacking without trashing security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-018", as: "gallant" }] },
        1: { battleArea: [{ card: "BT12-021", dp: 6000 }], security: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gallant"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("trashes exactly the top opposing security when the attack effect deletes no Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-018", as: "gallant" }] },
      1: { battleArea: [{ card: "BT12-021", dp: 7000 }], security: ["BT1-009", "BT1-010"] },
    });
    const top = s.state.players[1]!.security[0]!.instanceId;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gallant"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(top);
  });
});
