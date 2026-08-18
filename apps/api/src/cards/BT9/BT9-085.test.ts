import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-085.js";

describe("BT9-085 Matt Ishida & Sora Takenouchi", () => {
  it("independently gains memory for each player with 8 or more cards in hand", async () => {
    const eight = Array.from({ length: 8 }, () => "BT1-001");
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-085", as: "tamer" }], hand: eight }, 1: { hand: eight } });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));
    expect(s.state.memory).toBe(2);
  });

  it("may suspend when a blue or red Digimon unsuspends to return an opposing level 3", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-085", as: "tamer" }, { card: "BT9-008", as: "ally" }] }, 1: { battleArea: [{ card: "BT1-028", as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const targetInstanceId = s.perm("target").topCard!.instanceId;
    await advance(s.engine).fireSubTrigger("whenUnsuspended", { unsuspendedPermanentId: s.perm("ally").permanentId });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });
});
