import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-087.js";
import "../BT13/BT13-022.js";

describe("BT8-087 T.K. Takaishi", () => {
  it("suspends and draws when the opponent attacks one of your blue Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-087", as: "tamer" },
            { card: "BT8-021", as: "blueDefender", suspended: true },
          ],
          deck: [{ card: "BT8-033", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT8-017", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blueDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does not trigger when the attacked Digimon isn't blue", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-087", as: "tamer" },
            { card: "BT8-034", as: "yellowDefender", suspended: true },
          ],
          deck: [{ card: "BT8-033", as: "notDrawn" }],
        },
        1: { battleArea: [{ card: "BT8-017", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("yellowDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("sets memory to 3 at the start of its turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-087", as: "tamer" }] } });
    s.state.turnSeat = 0;
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));
    expect(s.state.memory).toBe(3);
  });

  it("plays itself from a face-up Security check without memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT8-087", as: "securityTk", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTk"));
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("securityTk").instanceId,
      ),
    ).toBe(true);
  });
});

describe("BT8-087 T.K. Takaishi — KB Q&A rulings", () => {
  it("does not trigger when your blue Digimon blocks an attack aimed elsewhere (Q1765)", async () => {
    const opponentAttacks = async (target: "player" | "kamemon") => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT8-087", as: "tamer" },
              { card: "BT13-022", as: "kamemon", suspended: target === "kamemon" },
            ],
            deck: ["BT8-033"],
            security: ["BT8-034"],
          },
          1: { battleArea: [{ card: "BT8-017", as: "attacker" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target:
            target === "player"
              ? { kind: "player" }
              : { kind: "permanent", permanentId: s.perm("kamemon").permanentId },
        }),
      ).toEqual({ ok: true });
      return s;
    };

    const blocked = await opponentAttacks("player");
    await settle(() => blocked.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      blocked.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: blocked.perm("kamemon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => blocked.events.some((event) => event.kind === "combatResolved"));
    expect(blocked.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT8-087"]);
    expect(blocked.perm("tamer").isSuspended).toBe(false);
    expect(blocked.state.players[0]!.hand).toHaveLength(0);

    const targeted = await opponentAttacks("kamemon");
    await settle(() => targeted.events.some((event) => event.kind === "combatResolved"));
    expect(targeted.perm("tamer").isSuspended).toBe(true);
    expect(targeted.state.players[0]!.hand).toHaveLength(1);
  });
});
