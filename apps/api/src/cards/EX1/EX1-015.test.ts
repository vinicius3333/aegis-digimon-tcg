import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-015.js";

describe("EX1-015 Garurumon", () => {
  it("plays a Matt Ishida costing 3 or less for free on attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-017", as: "attacker", under: ["EX1-015"] }],
          hand: [{ card: "ST2-12", as: "matt" }],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mattId = s.inst("matt").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === mattId));
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not play a different combined-name Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-017", as: "attacker", under: ["EX1-015"] }],
          hand: [{ card: "AD1-019", as: "combined" }],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const combinedId = s.inst("combined").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === combinedId)).toBe(true);
  });

  it("honors refusal when an eligible Matt Ishida is in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-017", as: "attacker", under: ["EX1-015"] }],
          hand: [{ card: "ST2-12", as: "matt" }],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-015"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("matt").instanceId)).toBe(true);
  });

  it("rejects a Matt Ishida whose play cost is greater than 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-017", as: "attacker", under: ["EX1-015"] }],
          hand: [{ card: "BT1-086", as: "matt" }],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-015"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("matt").instanceId)).toBe(true);
  });

  it("plays only one Matt Ishida across two player attacks in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-017", as: "attacker", under: ["EX1-015"] }],
          hand: [
            { card: "ST2-12", as: "matt1" },
            { card: "ST2-12", as: "matt2" },
            { card: "BT1-036", as: "unsuspender" },
          ],
        },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("attacker").isSuspended);
    expect(attack()).toEqual({ ok: true });
    // Once-per-turn: the second attack does not re-trigger EX1-015 at all, so there is no
    // second `effectResolved` to wait on — the proof is that the card never fires again.
    await drainMicrotasks();
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-015"),
    ).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("matt2").instanceId)).toBe(true);
  });

  it("plays an exact-name Matt Ishida at the cost-3 boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-017", as: "attacker", under: ["EX1-015"] }],
          hand: [{ card: "BT15-083", as: "matt" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mattId = s.inst("matt").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === mattId));
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("keeps Garurumon in a legal blue evolution stack and resolves its inherited effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-013", as: "source" }],
          hand: [
            { card: "EX1-015", as: "garurumon" },
            { card: "BT1-038", as: "host" },
            { card: "BT15-083", as: "matt" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mattId = s.inst("matt").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX1-015");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX1-013"]);
    expect(s.state.memory).toBe(8);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT1-038");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX1-013", "EX1-015"]);
    expect(s.state.memory).toBe(6);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === mattId));
    expect(s.state.players[0]!.hand).not.toContainEqual(expect.objectContaining({ instanceId: mattId }));
  });

  it("rejects evolution from a non-blue level-3 source without changing the stack or memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "invalidSource" }],
        hand: [{ card: "EX1-015", as: "evo" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("invalidSource").topCard.cardId).toBe("BT1-009");
    expect(s.perm("invalidSource").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX1-015");
  });
});
