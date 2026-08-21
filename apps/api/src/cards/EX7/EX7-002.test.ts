import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-002.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX7-002 Terriermon", () => {
  it("inherits once-per-turn draw when attacking if the opponent has no stacked Digimon", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Draw", amount: 1, condition: { kind: "opponentHasNone" } }] }));

  it("draws through a real attack only when the opponent has no digivolution cards", async () => {
    const s = setupEngine({ 0: { hand: ["AD1-001"], deck: ["AD1-001"], battleArea: [{ card: "AD1-001", as: "host", dp: 5000, under: ["EX7-002"] }] }, 1: { battleArea: [{ card: "AD1-001", as: "target", dp: 3000, suspended: true }] } });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "permanent", permanentId: s.perm("target").permanentId } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    assertNoLoudGap(s);
  });
});
