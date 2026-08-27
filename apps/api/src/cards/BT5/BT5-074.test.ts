import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-074.js";

describe("BT5-074 Troopmon", () => {
  it("uses exact card-name matching for the Troopmon reference", () => {
    expect(runtimeCompiledCard("BT5-074")?.effects[0]?.actions[0]).toMatchObject({
      target: {
        filter: {
          nameOrTrait: [{ tokens: ["Troopmon"], match: "nameExact" }],
        },
      },
    });
  });

  it("may play another Troopmon from hand when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-074", as: "source" }], hand: [{ card: "BT10-076", as: "other" }] },
        1: { hand: [{ card: "BT10-076", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const otherId = s.inst("other").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === otherId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === otherId)).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("opponent").instanceId)).toBe(true);
  });

  it("does not play a different purple Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT5-074", as: "source" }], hand: [{ card: "BT5-075", as: "other" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("other").instanceId)).toBe(true);
  });

  it("may decline playing a Troopmon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT5-074", as: "source" }], hand: [{ card: "BT10-076", as: "other" }] } },
      { autoDeclineOptional: true },
    );
    const otherId = s.inst("other").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === otherId)).toBe(true);
  });
});
