import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT2/BT2-086.js";
import "../P/P-011.js";
import "../P/P-012.js";
import "./BT1-115.js";

describe("V-Tamer/Veedramon SEC and promo deck", () => {
  it("chains both Tamers with Veedramon Zero's inherited draw and BT1 Veedramon's re-attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-012", as: "tai" },
            { card: "BT2-086", as: "rina" },
            { card: "BT1-115", as: "veedramon", dp: 10_000, under: ["P-011"] },
          ],
          deck: ["BT1-001", "BT1-002"],
          trash: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("tai").topCard.instanceId,
      effectKey: "P-012/main",
    })).toEqual({ ok: true });
    await settle(() => s.perm("tai").isSuspended && s.state.players[0]!.deck.length === 1);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("veedramon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("rina").isSuspended &&
      !s.perm("veedramon").isSuspended &&
      s.state.players[1]!.security.length === 1 &&
      s.state.players[0]!.trash.length === 0 &&
      s.state.players[0]!.deck.length === 3,
    );

    expect(s.perm("veedramon").currentDP).toBe(11_000);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("lets Veedramon Zero mill exactly 3 cards for its attack DP boost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-012" }, { card: "P-011", as: "zero", dp: 5000 }],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("zero").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.trash.length === 3 &&
      s.perm("zero").currentDP === 7000,
    );

    expect(s.perm("zero").currentDP).toBe(7000);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
