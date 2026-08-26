import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_023 } from "./BT25-023.js";
import "../index.js";

describe("BT25-023 Gaogamon", () => {
  it("plays one Thomas H. Norstein Tamer only with at most one Tamer in play", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_023.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        target: {
          filter: {
            controller: "mine",
            kind: ["Tamer"],
            nameOrTrait: [{ tokens: ["Thomas H. Norstein"], match: "name" }],
          },
          count: 1,
        },
        condition: {
          kind: "permanentCount",
          filter: { controllerDefault: "mine", kind: ["Tamer"] },
          op: "lte",
          value: 1,
        },
      });
    }
  });

  it("draws one for both players once per turn when attacking", () => {
    const effect = BT25_023.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(effect?.actions).toEqual([
      { kind: "Draw", amount: 1, controller: "mine" },
      { kind: "Draw", amount: 1, controller: "opponent" },
    ]);
  });

  it("plays BT25-087 Thomas H. Norstein from hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-023", as: "gaogamon" },
            { card: "BT25-087", as: "thomas" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-087"));
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toContain("BT25-087");
  });

  it("does not play Thomas when two Tamers are already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-087", as: "existingThomas" },
            { card: "BT13-097", as: "otherTamer" },
          ],
          hand: [
            { card: "BT25-023", as: "gaogamon" },
            { card: "BT25-087", as: "thomas" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-023"));
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT25-087")).toHaveLength(1);
  });

  it("draws one for each player once when carried as an inherited effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT25-023"] }],
          deck: ["AD1-001", "AD1-002"],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003"], deck: ["AD1-003", "AD1-004"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1 && s.state.players[1]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["AD1-001"]);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["AD1-003"]);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });
});
