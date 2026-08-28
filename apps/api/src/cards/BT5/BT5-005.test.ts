import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-005.js";

describe("BT5-005 Tsumemon", () => {
  it("draws once when its Unidentified host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-059", as: "host", under: ["BT5-005"] }], deck: ["BT1-009"] },
      1: { security: ["BT1-010"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not trigger for a host without the Unidentified type", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-021", as: "host", under: ["BT5-005"] }], deck: ["BT1-009"] },
      1: { security: ["BT1-010"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("matches exact Unidentified types across multiple hosts, not Unknown or other types", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-059", as: "unidentifiedA", under: ["BT5-005"] },
          { card: "BT5-063", as: "unidentifiedB", under: ["BT5-005"] },
          { card: "BT11-061", as: "unknown", under: ["BT5-005"] },
          { card: "BT5-021", as: "otherType", under: ["BT5-005"] },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
      1: { security: ["BT1-099", "BT1-099", "BT1-099", "BT1-099"] },
    });
    await s.ready();

    for (const name of ["unidentifiedA", "unidentifiedB", "unknown", "otherType"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(name).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      await advance(s.engine).verb.unsuspend([s.perm(name).permanentId]);
    }

    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("draws only once from the same inherited effect across repeated attacks in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-059", as: "host", under: ["BT5-005"] }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { security: ["BT1-099", "BT1-099"] },
    });
    await s.ready();

    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);

    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("keeps the inherited draw through a legal multi-step breeding evolution", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT5-005", as: "host" },
        hand: [
          { card: "BT5-059", as: "keramon" },
          { card: "BT5-063", as: "kurisarimon" },
        ],
        deck: ["BT1-009"],
      },
      1: { security: ["BT1-099"] },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("keramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT5-059");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT5-005"]);

    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").inBreeding);
    s.state.phase = Phase.Main;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("kurisarimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT5-063");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT5-005", "BT5-059"]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
