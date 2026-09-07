import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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

  it("Progress protects the attacking card from an opponent effect, but not outside its attack", async () => {
    const attacking = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-025", as: "lamiamon", dp: 4000 }], deck: ["BT1-009", "BT1-009"] },
        1: { security: [{ card: "ST1-16", as: "securityEffect" }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await attacking.ready();
    expect(
      attacking.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacking.perm("lamiamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => attacking.state.players[1]!.security.length === 0);
    expect(attacking.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-025")).toBe(true);

    const outside = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-025", as: "lamiamon", dp: 7000 }], deck: ["BT1-009", "BT1-009"] },
        1: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [{ card: "ST1-16", as: "removal" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    outside.state.turnSeat = 1;
    outside.state.memory = 10;
    await outside.ready();
    expect(outside.engine.applyIntent(1, { type: "playCard", instanceId: outside.inst("removal").instanceId })).toEqual(
      { ok: true },
    );
    await settle(() => outside.state.players[0]!.battleArea.length === 0);
    expect(outside.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("trashes the opponent's top security from a public Raid target switch", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-025", as: "lamiamon" }],
          hand: [{ card: "BT21-075", as: "raidGrant" }],
          security: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "raidTarget" }],
          security: ["BT1-001", "BT1-002"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("lamiamon").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("raidGrant").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("lamiamon"), "Raid"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lamiamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-001");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
  });

  it("trashes security only once across two public Raid target switches while Lamiamon remains active", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-025", as: "lamiamon" },
            { card: "BT21-026", as: "firstRaid" },
            { card: "BT21-026", as: "secondRaid" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget" },
            { card: "BT1-010", as: "secondTarget" },
          ],
          security: ["BT1-001", "BT1-002"],
          deck: ["BT1-003", "BT1-004", "BT1-005"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firstTargetId = s.inst("firstTarget").instanceId;
    const secondTargetId = s.inst("secondTarget").instanceId;
    const retainedSecurityId = s.state.players[1]!.security[1]!.instanceId;

    for (const attacker of ["firstRaid", "secondRaid"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(attacker).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !observe(s.engine).isAttacking() &&
          s.state.players[1]!.battleArea.length === (attacker === "firstRaid" ? 1 : 0) &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.players[1]!.security).toHaveLength(1);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-025")).toBe(true);
    }

    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-001");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).not.toContain("BT1-002");
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([retainedSecurityId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([firstTargetId, secondTargetId]),
    );
  });

  it("plays a qualifying inherited Digimon from a public security attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-026", as: "host", under: ["BT21-025"] },
            { card: "BT21-011", as: "attacker" },
          ],
          hand: [
            { card: "BT21-017", as: "free" },
            { card: "BT21-015", as: "secondEligible" },
          ],
          security: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-001"], deck: ["BT1-009", "BT1-009", "BT1-009"] },
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
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondEligible").instanceId);
  });

  it("plays the inherited Digimon only once across two public security removals in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-026", as: "host", under: ["BT21-025"] },
            { card: "BT21-011", as: "firstAttacker" },
          ],
          hand: [
            { card: "BT21-017", as: "firstEligible" },
            { card: "BT21-015", as: "secondEligible" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-001", "BT1-002"], deck: ["BT1-003", "BT1-004", "BT1-005"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.security.length === 1 &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-017"),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondEligible").instanceId);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT21-017")).toHaveLength(
      1,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT21-017")).toHaveLength(
      1,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondEligible").instanceId);
    const host = s.perm("host");
    expect(host.topCard.cardId).toBe("BT21-026");
    expect(host.stack.filter((card) => card.instanceId !== host.topCard.instanceId).map((card) => card.cardId)).toEqual(
      ["BT21-025"],
    );
  });

  it("inherited effect optionally plays exactly one qualifying 5000 DP Reptile or Dragonkin for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-026", as: "host", under: ["BT21-025"] }],
          hand: [
            { card: "BT21-017", as: "eligible" },
            { card: "BT21-015", as: "secondEligible" },
            { card: "BT1-031", as: "wrongTrait" },
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
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondEligible").instanceId);
  });

  it("publicly declines the inherited play after an opponent security removal and preserves exact hand boundaries", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-026", as: "host", under: ["BT21-025"] },
            { card: "BT1-009", as: "attacker" },
          ],
          hand: [
            { card: "BT21-017", as: "eligible4000" },
            { card: "BT21-015", as: "eligible5000" },
            { card: "BT21-026", as: "tooLarge11000" },
            { card: "BT1-031", as: "wrongTrait1000" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { security: ["BT1-001"], deck: ["BT1-002", "BT1-003", "BT1-004"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    // The inherited watcher was reached by a real public security removal. Confirm that its
    // optional decision was actually opened, then decline the zero-cost play; every candidate
    // remains in hand and memory does not move.
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length === 1);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("eligible4000").instanceId,
      s.inst("eligible5000").instanceId,
      s.inst("tooLarge11000").instanceId,
      s.inst("wrongTrait1000").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT21-017")).toHaveLength(
      0,
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
            battleArea: [{ card: "BT21-026", as: "host", under: ["BT21-025"] }],
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
