import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-024.js";
import "../index.js";

describe("BT21-024 Cyberdramon", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("places an opponent hand card as bottom security only at five or fewer, then trashes the top card", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              controller: "opponent",
              amount: 1,
              source: "hand",
              condition: {
                kind: "zoneCount",
                seat: "opponent",
                zone: "security",
                op: "lte",
                value: 5,
                raw: "your opponent has 5 or fewer security cards",
              },
            },
            { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 },
          ],
        }),
      );
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            amount: 4000,
            duration: "permanent",
          },
        ],
      }),
    );
  });

  it("on play makes the opponent bottom-deck a hand card into security, then trashes the prior top card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-024", as: "cyberdramon" }] },
        1: {
          hand: [{ card: "BT1-009", as: "placed" }],
          security: [
            { card: "BT1-001", as: "top" },
            { card: "BT1-002", as: "bottom" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyberdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 1);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toContain(s.inst("placed").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("top").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("at six security skips the hand placement but still trashes the top security card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-024", as: "cyberdramon" }] },
        1: {
          hand: [{ card: "BT1-009", as: "kept" }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyberdramon").instanceId });
    await settle(() => s.state.players[1]!.trash.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(5);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("kept").instanceId);
  });

  it("at exactly five security places a hand card at the bottom, then trashes the prior top", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-024", as: "cyberdramon" }] },
        1: {
          hand: [{ card: "BT1-009", as: "placed" }],
          security: [{ card: "BT1-001", as: "exactTop" }, "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyberdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(5);
    expect(s.state.players[1]!.security.at(-1)?.instanceId).toBe(s.inst("placed").instanceId);
    expect(s.state.players[1]!.trash[0]?.instanceId).toBe(s.inst("exactTop").instanceId);
  });

  it("with an empty opponent hand still trashes the top security card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-024", as: "cyberdramon" }] },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyberdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("digivolves through its legal red level-4 stack and grants the inherited +4000 DP to its host", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT21-024", as: "cyberdramon" }],
        battleArea: [{ card: "BT21-019", as: "level4" }],
      },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("cyberdramon").instanceId,
        permanentId: s.perm("level4").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("level4").topCard.cardId === "BT21-024");
    expect(s.perm("level4").stack.map((card) => card.cardId)).toContain("BT21-019");

    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT21-028", as: "host", under: ["BT21-019", "BT21-024"] }] },
    });
    await inherited.ready();
    expect(inherited.perm("host").currentDP).toBe(18000);
  });
});
