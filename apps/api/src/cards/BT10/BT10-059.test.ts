import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-059.js";

describe("BT10-059 Spadamon", () => {
  it("may place itself under a matching Digimon to De-Digivolve an opponent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT10-059", as: "source" }], battleArea: [{ card: "BT10-034", as: "host" }] },
        1: { battleArea: [{ card: "BT10-020", under: ["BT10-018"], as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").permanentId, s.perm("target").permanentId);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("host").stack.some(({ cardId }) => cardId === "BT10-059") &&
        s.perm("target").topCard.cardId === "BT10-018",
    );
    expect(s.perm("host").stack[0]?.cardId).toBe("BT10-059");
    expect(s.perm("target").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("pays the placement cost even when there is no opponent to De-Digivolve", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-059", as: "source" }],
          battleArea: [{ card: "BT10-034", as: "host", under: [{ card: "BT1-009", as: "existing" }] }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("host").permanentId);
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some(({ cardId }) => cardId === "BT10-059"));

    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT10-059", "BT1-009"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("resolves the inherited reveal independently for two copies on one attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-034",
              as: "attacker",
              under: ["BT10-059", "BT10-059"],
            },
          ],
          deck: ["BT10-061", "BT10-058", "BT10-061", "BT10-058", "BT10-061", "BT10-058"],
        },
        1: { security: ["BT1-009"] },
      },
      {
        autoOrderCards: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
      },
    );
    s.state.phase = Phase.Main;
    s.state.memory = 0;
    s.perm("attacker").canAttackPlayer = true;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.length === 2 &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(new Set(s.state.players[0]!.hand.map(({ instanceId }) => instanceId))).toHaveLength(2);
    expect(s.state.players[0]!.hand.every(({ cardId }) => cardId === "BT10-061" || cardId === "BT10-058")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    assertNoLoudGap(s);
  });
});
