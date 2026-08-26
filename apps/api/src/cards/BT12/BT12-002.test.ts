import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-002.js";

describe("BT12-002 DemiVeemon", () => {
  it("draws when its host attacks while its controller has a green Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-002"] }, "BT12-047"],
        deck: ["BT1-010"],
        security: ["BT1-009"],
      },
      1: { security: ["BT1-009"] },
    });
    await s.ready();
    const before = s.state.players[0]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === before - 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw without a green Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-002"] }], deck: ["BT1-010"] },
    });
    const before = s.state.players[0]!.deck.length;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.deck.length === before);
    expect(s.state.players[0]!.deck.length).toBe(before);
  });

  it("does not count an opponent's green Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-002"] }], deck: ["BT1-010"] },
      1: { battleArea: ["BT12-047"] },
    });
    const before = s.state.players[0]!.deck.length;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.deck.length === before);
    expect(s.state.players[0]!.deck).toHaveLength(before);
  });

  it("draws only once per turn across repeated attack timings", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-002"] }, "BT12-047"],
        deck: ["BT1-010", "BT1-010"],
      },
    });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
