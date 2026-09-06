import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-018.js";
import "./index.js";
import "./BT20-014.js";
import "./BT20-087.js";
import "./BT20-019.js";
import "./BT20-060.js";
import "../BT1/BT1-036.js";

describe("BT20-018 Ouryumon", () => {
  it("de-digivolves and attack-gates breeding-area Chronicle evolution on both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "DeDigivolve",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: 2,
          },
          {
            kind: "Digivolve",
            target: { targetBreeding: true },
            from: ["hand", "trash"],
            payCost: false,
            optional: true,
            condition: { kind: "duringAttack" },
            into: {
              levelComparison: { op: "lte", value: 6 },
              nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
            },
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
          actions: [{ kind: "Delete", target: { filter: { superlative: "lowestDP" } } }],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Trash",
          target: { filter: { position: "top" }, count: 1 },
          condition: { kind: "selfHasName", names: ["Alphamon: Ouryuken"] },
        },
      ],
    });
  });

  it("during an attack immediately evolves the breeding Digimon for free", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT20-012", as: "breedingGinryumon", under: ["BT20-010"] },
          battleArea: [
            { card: "BT20-015", as: "attacker", under: ["BT20-010", "BT20-012"] },
            { card: "BT20-087", as: "tamer" },
          ],
          hand: [{ card: "BT20-018", as: "ouryumon" }],
          trash: [{ card: "BT20-015", as: "breedingEvolution" }],
        },
        1: { security: ["BT1-010", "BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT20-012");
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(["BT20-010"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("attacker").topCard.cardId === "BT20-018" && s.state.players[0]!.breeding?.topCard.cardId === "BT20-015",
    );

    expect(s.state.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-012", "BT20-010"]),
    );
    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
  });

  it("publicly de-digivolves exactly the top two cards and leaves the bottom level-4 card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-018", as: "ouryumon" }] },
        1: { battleArea: [{ card: "BT20-017", as: "opponentStack", under: ["BT20-013", "BT20-014"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ouryumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[1]!.trash.filter((card) => ["BT20-017", "BT20-014"].includes(card.cardId)).length === 2,
    );
    expect(s.perm("opponentStack").topCard.cardId).toBe("BT20-013");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-017", "BT20-014"]),
    );
    expect(s.state.memory).toBe(-2); // catalog On Play cost 12 from the legal maximum fixture gauge 10.
  });

  it("reaches Ouryumon from a legal Hisyaryumon stack through public evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-015", as: "base" }], hand: [{ card: "BT20-018", as: "ouryumon" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ouryumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-018");
    expect(s.perm("base").topCard.cardId).toBe("BT20-018");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT20-015"]);
  });

  it("can decline the optional during-attack breeding evolution", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT20-012", as: "breeding", under: ["BT20-010"] },
          battleArea: [
            { card: "BT20-015", as: "attacker", under: ["BT20-010", "BT20-012"] },
            { card: "BT20-087", as: "tamer" },
          ],
          hand: [{ card: "BT20-018", as: "ouryumon" }],
          trash: [{ card: "BT20-015", as: "candidate" }],
        },
        1: { security: ["BT1-010"] },
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
    await settle(() => false, 20);
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT20-012");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ouryumon").instanceId);
  });

  it("accepts the Tamer attack evolution, then publicly declines Ouryumon's breeding evolution", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT20-012", as: "breeding", under: ["BT20-010"] },
          battleArea: [
            { card: "BT20-015", as: "attacker", under: ["BT20-010", "BT20-012"] },
            { card: "BT20-087", as: "tamer" },
          ],
          hand: [{ card: "BT20-018", as: "ouryumon" }],
          trash: [{ card: "BT20-015", as: "candidate" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "BT20-018");
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("attacker").topCard.cardId).toBe("BT20-018");
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT20-012");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT20-015");
  });

  it("does not offer the breeding evolution outside an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-015", as: "base" }],
          breeding: { card: "BT20-012", as: "breeding", under: ["BT20-010"] },
          hand: [{ card: "BT20-018", as: "ouryumon" }],
          trash: ["BT20-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ouryumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-018");
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT20-012");
  });

  it.each([
    ["wrong trait", "BT20-014", "BT20-017"],
    ["above level 6", "BT20-019", "BT20-060"],
  ] as const)("rejects a %s breeding candidate during the legal attack", async (_label, breedingSource, candidate) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: breedingSource, as: "breeding" },
          battleArea: [
            { card: "BT20-015", as: "attacker", under: ["BT20-010", "BT20-012"] },
            { card: "BT20-087", as: "tamer" },
          ],
          hand: [
            { card: "BT20-018", as: "ouryumon" },
            { card: candidate, as: "candidate" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("attacker").permanentId);
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "BT20-018" && s.state.pendingDecision === undefined);
    expect(s.perm("attacker").topCard.cardId).toBe("BT20-018");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe(breedingSource);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain(candidate);
  });

  it("once per turn deletes one opposing Digimon with the lowest DP when either security stack loses a card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-018", as: "ouryumon" },
          { card: "BT20-012", as: "secondAttacker" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT20-014", dp: 4000, as: "lowest" },
          { card: "BT20-014", dp: 7000, as: "higher" },
        ],
      },
    });
    await s.ready();
    const lowestId = s.perm("lowest").permanentId;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === lowestId));
    expect(s.perm("higher")).toBeDefined();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => false, 50);
    expect(s.perm("higher")).toBeDefined();
  });

  it("naturally deletes a tied lowest target once, then resets on a later turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-018", as: "ouryumon" },
            { card: "BT20-012", as: "secondAttacker" },
          ],
          hand: ["BT20-010"],
          deck: ["BT20-010", "BT20-010", "BT20-010"],
        },
        1: {
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: ["BT20-010", "BT20-010"],
          hand: ["BT20-010"],
          battleArea: [
            { card: "BT20-010", dp: 3000, as: "lowestA" },
            { card: "BT20-010", dp: 3000, as: "lowestB" },
            { card: "BT20-012", dp: 4000, as: "higher" },
          ],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ouryumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.currentDP === 3000)).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.currentDP === 3000)).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 3);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(3);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("higher").permanentId,
    ]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("as an Alphamon: Ouryuken source trashes top security when the host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-060", as: "ouryuken", under: ["BT20-018"] }] },
        1: { security: ["BT1-010", "BT1-010", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("ouryuken"));
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("resets the inherited security-trash Once Per Turn across a real turn while preserving the 018 source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-060", as: "host", under: ["BT20-018"] }],
          hand: [{ card: "BT1-036", as: "garurumon" }, "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          security: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    s.state.memory = 7;
    await s.ready();

    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 4 && s.state.memory === 10);
    expect(s.state.players[1]!.security).toHaveLength(4);
    expect(s.state.memory).toBe(10);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("garurumon").instanceId));
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(4);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 3 && s.state.memory === 4);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 1 && s.state.memory === 6);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(6);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(3);
    expect(s.perm("host").topCard.cardId).toBe("BT20-060");
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT20-018");
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("naturally trashes the identified top security card only for an Alphamon: Ouryuken host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-060", as: "ouryuken", under: ["BT20-018"] }] },
      1: {
        security: [
          { card: "BT1-010", as: "top" },
          { card: "BT1-010", as: "next" },
        ],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ouryuken").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("top").instanceId);

    const ordinary = setupEngine({
      0: { battleArea: [{ card: "BT20-018", as: "ordinary" }] },
      1: { security: [{ card: "BT1-010", as: "ordinaryTop" }, { card: "BT1-010" }] },
    });
    await ordinary.ready();
    expect(
      ordinary.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: ordinary.perm("ordinary").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => ordinary.state.players[1]!.security.length === 1);
    expect(ordinary.state.players[1]!.trash.map((card) => card.instanceId)).toContain(
      ordinary.inst("ordinaryTop").instanceId,
    );
    expect(ordinary.state.players[1]!.trash).toHaveLength(1);
  });

  it("does not grant the inherited security-trash effect to another legal level-7 host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-112", as: "otherLv7", under: ["BT20-018"] }], deck: ["BT20-010"] },
      1: { security: ["BT1-010", "BT1-010"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherLv7").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
