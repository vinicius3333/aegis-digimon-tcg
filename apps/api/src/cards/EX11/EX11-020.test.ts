import { digivolutionRequirementsFor, EffectDuration, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT21/BT21-025.js";
import "./EX11-019.js";
import "./EX11-020.js";

const cardId = "EX11-020";

describe("EX11-020 Hanimon", () => {
  it("matches the catalog and encodes the conditional play, evolution routes, and optional inherited cost", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Hanimon",
      colors: ["Yellow", "Purple"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Yellow", level: 2, memoryCost: 1 },
        { color: "Purple", level: 2, memoryCost: 1 },
      ],
      types: ["Puppet", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Kyaromon"], cost: 0, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Shoemon"], match: "nameExact" }] },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: {
            kind: "not",
            condition: { kind: "triggerRemovalCause", removalCause: "byBattle" },
            raw: "deleted other than in battle",
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "deleteOwn",
            target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
          },
          actions: [{ kind: "EndAttack" }],
        },
      ],
    });
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
  });

  it("plays Shoemon from hand only after non-battle deletion and may decline", async () => {
    const accepted = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "hanimon" }], hand: [{ card: "EX11-019", as: "shoemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await accepted.ready();
    expect(
      await advance(accepted.engine).verb.deletePermanent([accepted.perm("hanimon").permanentId], "byEffect"),
    ).toBe(1);
    await settle(() => accepted.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-019"));
    expect(accepted.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(accepted);

    const declined = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "hanimon" }], hand: [{ card: "EX11-019", as: "shoemon" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    expect(
      await advance(declined.engine).verb.deletePermanent([declined.perm("hanimon").permanentId], "byEffect"),
    ).toBe(1);
    await settle(() => false, 40);
    expect(declined.state.players[0]!.battleArea).toHaveLength(0);
    expect(declined.state.players[0]!.hand).toHaveLength(1);
    assertNoLoudGap(declined);
  });

  it("does not play Shoemon after battle deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "hanimon" }], hand: [{ card: "EX11-019", as: "shoemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(await advance(s.engine).verb.deletePermanent([s.perm("hanimon").permanentId], "byBattle")).toBe(1);
    await settle(() => false, 40);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    assertNoLoudGap(s);
  });

  it("inherits only under a host and ends an opponent attack before security/counter/block processing (Q5804)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-032", as: "host", under: [cardId] },
            { card: "BT1-009", as: "fodder" },
            { card: cardId, as: "top" },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const fodderId = s.perm("fodder").permanentId;
    expect(observe(s.engine).subscriptions("whenOpponentAttacks", s.perm("host").permanentId)).toHaveLength(1);
    expect(observe(s.engine).subscriptions("whenOpponentAttacks", s.perm("top").permanentId)).toHaveLength(0);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === fodderId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.events.some(({ kind }) => kind === "blockWindowOpened" || kind === "counterWindowOpened")).toBe(false);
    assertNoLoudGap(s);
  });

  it("may decline the inherited cost, leaving the Digimon alive and the attack successful", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-032", as: "host", under: [cardId] },
            { card: "BT1-009", as: "fodder" },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("fodder").permanentId)).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("cannot end the attack when another effect prevents payment of the deletion cost (Q5803)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-032", as: "host", under: [cardId] },
            { card: "BT1-032", as: "protectedFodder" },
          ],
          security: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const protectedId = s.perm("protectedFodder").permanentId;
    advance(s.engine).ledgers.continuous.addRestriction(protectedId, "beDeleted", EffectDuration.Permanent);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("ends a Progress attack even though the attacker is unaffected by opposing effects (Q5805)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-032", as: "host", under: [cardId] },
            { card: "BT1-009", as: "fodder" },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT21-025", as: "progressAttacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("progressAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("spends the inherited once-per-turn budget on the first attack only", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-032", as: "host", under: [cardId] },
            { card: "BT1-009", as: "firstFodder" },
            { card: "BT1-010", as: "secondFodder" },
          ],
          security: ["BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker" },
            { card: "BT1-010", as: "secondAttacker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("uses normal yellow/purple level-2 routes, Kyaromon cost 0, and rejects off-color", async () => {
    for (const [baseCardId, useAlternateCost, memory] of [
      ["BT1-006", false, 1],
      ["BT3-006", false, 1],
      ["BT1-005", true, 0],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "hanimon" }] },
      });
      s.state.memory = memory;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("hanimon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === cardId);
      expect(s.state.memory).toBe(0);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "base" }], hand: [{ card: cardId, as: "hanimon" }] },
    });
    invalid.state.memory = 1;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("hanimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
