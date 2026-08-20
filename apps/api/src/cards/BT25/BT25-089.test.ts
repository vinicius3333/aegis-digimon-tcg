import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT25-089 Kazuki & Itsuki", () => {
  it("gains exactly 1 memory at start main only when the opponent has a battle-area Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-089", as: "tamer" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));
    expect(s.state.memory).toBe(1);
  });

  it("suspends itself, pays link cost reduced by 2, and links an Appmon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-089", as: "tamer" },
            { card: "BT21-009", as: "host" },
          ],
          hand: [{ card: "BT26-010", as: "link" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("tamer"));

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(2);
  });

  it("does not offer an Appmon card without its own Link requirement (Q6422)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-089", as: "tamer" },
            { card: "BT21-009", as: "host" },
          ],
          hand: [{ card: "BT21-005", as: "noLink" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("tamer"));
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("noLink").instanceId);
  });

  it("app fuses a legal host at end of turn and carries the old top under the result", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-089", as: "tamer" },
            { card: "BT25-070", as: "host", linked: [{ card: "BT21-059", as: "timemon" }] },
          ],
          hand: [{ card: "BT25-072", as: "result" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("tamer"));
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("result").instanceId);
    // Shutmon's own When Digivolving may immediately link the carried Logamon;
    // either destination proves App Fusion first carried the old top under it.
    expect([...s.perm("host").stack, ...s.perm("host").linked].map((card) => card.cardId)).toContain("BT25-070");
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not app fuse when the host lacks the target's second required Appmon name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-089", as: "tamer" },
            { card: "BT25-070", as: "host", linked: [{ card: "BT23-016" }] },
          ],
          hand: [{ card: "BT25-072", as: "result" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("tamer"));
    expect(s.perm("host").topCard.cardId).toBe("BT25-070");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("result").instanceId);
  });

  it("plays itself for free from Security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT25-089", as: "tamer" }] },
      1: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 20000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    ).toBe(true);
  });
});
