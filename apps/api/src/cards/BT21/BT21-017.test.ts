import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-017.js";
import "../index.js";

describe("BT21-017 Dimetromon", () => {
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

  it("plays Owen Dreadnought when digivolving with at most one Tamer and gains memory once per turn on security removal", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["Owen Dreadnought"], match: "nameExact" }] },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
            condition: {
              kind: "permanentCount",
              seat: "mine",
              filter: { controllerDefault: "mine", kind: ["Tamer"] },
              op: "lte",
              value: 1,
              raw: "you have 1 or fewer Tamers",
            },
            optional: true,
          },
        ],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSecurityRemoved",
            sourceFilter: { controller: "opponent" },
            fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
            actions: [{ kind: "GainMemory", amount: 1 }],
          },
        ],
      }),
    ]);
  });

  it.each([
    ["zero", []],
    ["one", ["BT1-085"]],
  ])("plays Owen free after digivolving with %s existing Tamers", async (_label, tamers) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-007", as: "base" },
            ...tamers.map((card, index) => ({ card, as: `tamer${index}` })),
          ],
          hand: [
            { card: "BT21-017", as: "dimetromon" },
            { card: "BT21-081", as: "owen" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dimetromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-081"));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not play Owen with two Tamers and may decline with one", async () => {
    const blocked = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-007", as: "base" }, { card: "BT1-085" }, { card: "BT1-087" }],
          hand: [
            { card: "BT21-017", as: "dimetromon" },
            { card: "BT21-081", as: "owen" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    blocked.state.memory = 4;
    await blocked.ready();
    blocked.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: blocked.perm("base").permanentId,
      instanceId: blocked.inst("dimetromon").instanceId,
    });
    await settle(() => blocked.perm("base").topCard.cardId === "BT21-017");
    expect(blocked.state.players[0]!.hand.map((card) => card.instanceId)).toContain(blocked.inst("owen").instanceId);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-007", as: "base" }],
          hand: [
            { card: "BT21-017", as: "dimetromon" },
            { card: "BT21-081", as: "owen" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    declined.state.memory = 4;
    await declined.ready();
    declined.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: declined.perm("base").permanentId,
      instanceId: declined.inst("dimetromon").instanceId,
    });
    await settle(() => declined.perm("base").topCard.cardId === "BT21-017");
    expect(declined.state.players[0]!.hand.map((card) => card.instanceId)).toContain(declined.inst("owen").instanceId);
  });

  it("gains memory once only for opponent security removal", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-024", as: "host", under: ["BT21-017"] }] },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.memory).toBe(0);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when an opponent attacks and removes this player's security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-024", as: "host", under: ["BT21-017"] }],
          security: ["BT1-001"],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT21-011", as: "opponentAttacker" }],
          security: ["BT1-002"],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.memory).toBe(0);
  });

  it("gains inherited memory only once across two public opponent-security removals in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-024", as: "host", under: ["BT21-017"] },
            { card: "BT21-011", as: "firstAttacker" },
            { card: "BT21-011", as: "secondAttacker" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-001", "BT1-002"], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    for (const alias of ["firstAttacker", "secondAttacker"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length < (alias === "firstAttacker" ? 2 : 1));
    }
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(1);
  });

  it("gains memory from a public attack that removes the opponent's security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-024", as: "host", under: ["BT21-017"] },
          { card: "BT21-011", as: "attacker" },
        ],
      },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});
