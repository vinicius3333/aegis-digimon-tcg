import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-017.js";

describe("EX6-017 Luxmon", () => {
  it("reveals three and adds up to Angel/Archangel and Three Great Angels cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    });
  });
  it("inherits once-per-turn draw when attacking with the required traits", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "selfHasTrait" } }],
    });
  });

  it("draws once when its Angel-family stack host attacks", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-060", as: "host", under: ["EX6-017"] }], deck: [{ card: "BT1-001", as: "drawn" }] } });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
