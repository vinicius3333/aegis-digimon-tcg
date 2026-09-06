import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-025.js";
import "../index.js";

describe("BT21-025 Lamiamon", () => {
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

  it("trashes the opponent's top security card when an eligible attack target changes", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Progress", raw: "＜Progress＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenAttackTargetSwitched",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }],
            },
            actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
          },
        ],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSecurityRemoved",
            sourceFilter: { controller: "opponent" },
            actions: [
              {
                kind: "PlayWithoutCost",
                from: ["hand"],
                payCost: false,
                optional: true,
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    dp: { op: "lte", value: 5000 },
                    nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }],
                  },
                  count: 1,
                },
              },
            ],
            fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
          },
        ],
      }),
    );
  });

  it("trashes security only for a controller's Reptile or Dragonkin target change and only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-025", as: "lamiamon" },
          { card: "BT21-008", as: "reptile" },
          { card: "BT1-009", as: "nonmatching" },
        ],
      },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("nonmatching").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(2);
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("reptile").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("reptile").permanentId,
    });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("trashes the opponent's top security from a public Raid target switch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-024", as: "host", under: ["BT21-025"] },
            { card: "RB1-008", as: "raider" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "raidTarget", suspended: true }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raider").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-001");
  });

  it("plays a qualifying inherited Digimon from a public security attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-024", as: "host", under: ["BT21-025"] },
            { card: "BT21-011", as: "attacker" },
          ],
          hand: [{ card: "BT21-017", as: "free" }],
        },
        1: { security: ["BT1-001"] },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-017"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("inherited effect optionally plays exactly one qualifying 5000 DP Reptile or Dragonkin for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-024", as: "host", under: ["BT21-025"] }],
          hand: [
            { card: "BT21-017", as: "eligible" },
            { card: "BT1-009", as: "wrongTrait" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-017"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-017")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wrongTrait").instanceId);
    expect(s.state.memory).toBe(4);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT21-017")).toHaveLength(
      1,
    );
  });

  it("does not play for the controller's security removal and permits declining the optional play", async () => {
    for (const [removedFromSecuritySeat, options] of [
      [0, { autoAcceptOptional: true, autoSelectCards: true }],
      [1, { autoDeclineOptional: true }],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT21-024", as: "host", under: ["BT21-025"] }],
            hand: [{ card: "BT21-017", as: "eligible" }],
          },
        },
        options,
      );
      await s.ready();
      await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat });
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
    }
  });
});
