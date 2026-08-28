import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-002.js";
import "../index.js";

describe("BT21-002 Gurimon", () => {
  it("encodes the inherited Gammamon-text or Hero condition once per turn", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 1,
            condition: {
              kind: "anyOf",
              conditions: [
                { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }] } },
                { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Hero"], match: "trait" }] } },
              ],
              raw: "this Digimon has [Gammamon] in its text or the [Hero] trait",
            },
          },
        ],
      }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["Hero trait", "BT21-011"],
    ["Gammamon in text", "BT10-011"],
  ])("draws when the attacking host qualifies by %s", async (_label, hostCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: hostCard, as: "host", under: ["BT21-002"] }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
      1: { security: ["BT1-002"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does not draw for a near-match-free non-Hero host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT21-002"] }],
        deck: [{ card: "BT1-001", as: "top" }],
      },
      1: { security: ["BT1-002"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws only once across repeated attacks in the same turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-028", as: "host", under: ["BT21-002"] }],
        deck: [
          { card: "BT1-001", as: "first" },
          { card: "BT1-002", as: "second" },
        ],
      },
      1: { security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"] },
    });
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
});
