import { digivolutionRequirementsFor, EffectDuration, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT21/BT21-025.js";
import "./EX11-019.js";
import "./EX11-021.js";

const cardId = "EX11-021";

describe("EX11-021 Kokeshimon", () => {
  it("legally evolves from a Puppet level 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-019", as: "base", dp: 2000 }],
          hand: [{ card: "EX11-021", as: "kokeshi" }, "EX11-061"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kokeshi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX11-021", 600);
    expect(s.perm("base").topCard?.cardId).toBe("EX11-021");
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-061"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-061")).toBe(true);
  });

  it("encodes conditional Mirai play and the cost-gated inherited EndAttack", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Kokeshimon",
      colors: ["Yellow", "Purple"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      types: ["Puppet", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Puppet"], cost: 2, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: { kind: "permanentCount", op: "lte", value: 1 },
        },
      ],
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OpponentsTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOpponentAttacks",
            optional: true,
            abortOnDecline: true,
            cost: expect.objectContaining({
              kind: "deleteOwn",
              target: expect.objectContaining({ filter: expect.objectContaining({ excludeSelf: true }) }),
            }),
            actions: [{ kind: "EndAttack" }],
          },
        ],
      }),
    );
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
  });

  it.each([0, 1])("may play Mirai for free with %i Tamer already in play", async (tamerCount) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-019", as: "base" },
            ...(tamerCount === 1 ? ([{ card: "EX11-057", as: "existingTamer" }] as const) : []),
          ],
          hand: [
            { card: cardId, as: "kokeshi" },
            { card: "EX11-061", as: "mirai" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kokeshi").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-061")).toBe(true);
    expect(s.state.memory).toBe(8);
    assertNoLoudGap(s);
  });

  it("does not offer Mirai with 2 Tamers and preserves the optional decline branch", async () => {
    const tooMany = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-019", as: "base" },
            { card: "EX11-057", as: "firstTamer" },
            { card: "EX11-057", as: "secondTamer" },
          ],
          hand: [
            { card: cardId, as: "kokeshi" },
            { card: "EX11-061", as: "mirai" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    tooMany.state.memory = 10;
    await tooMany.ready();
    expect(
      tooMany.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: tooMany.perm("base").permanentId,
        instanceId: tooMany.inst("kokeshi").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => tooMany.perm("base").topCard.cardId === cardId);
    expect(tooMany.state.players[0]!.hand).toHaveLength(1);
    expect(tooMany.decisions.some(({ req }) => req.kind === "optional")).toBe(false);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-019", as: "base" }],
          hand: [
            { card: cardId, as: "kokeshi" },
            { card: "EX11-061", as: "mirai" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    declined.state.memory = 10;
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: declined.perm("base").permanentId,
        instanceId: declined.inst("kokeshi").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.perm("base").topCard.cardId === cardId);
    expect(declined.state.players[0]!.hand).toHaveLength(1);
    expect(declined.state.players[0]!.battleArea).toHaveLength(1);
    assertNoLoudGap(declined);
  });

  it("deletes another Digimon and ends even an unaffected Progress attack before later windows (Q5807/Q5808)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-032", as: "host", under: [cardId] },
            { card: "BT1-009", as: "fodder" },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT21-025", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const fodderId = s.perm("fodder").permanentId;
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

  it("does not end the attack when another effect prevents the deletion cost (Q5806)", async () => {
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
    await settle(
      () =>
        s.state.players[0]!.security.length === 1 &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === protectedId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("may decline the inherited deletion cost and spends its once-per-turn use only after activation", async () => {
    const declined = setupEngine(
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
    declined.state.turnSeat = 1;
    expect(
      declined.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: declined.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        declined.state.players[0]!.security.length === 0 &&
        declined.state.pendingDecision === undefined &&
        !observe(declined.engine).isAttacking(),
    );
    expect(declined.state.players[0]!.battleArea).toHaveLength(2);
    assertNoLoudGap(declined);
  });

  it("resets the inherited once-per-turn attack ending on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-032", as: "host", under: [cardId] },
            { card: "BT1-009", as: "firstFodder" },
            { card: "BT1-010", as: "secondFodder" },
            { card: "BT1-011", as: "thirdFodder" },
          ],
          security: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          deck: ["BT1-015", "BT1-016", "BT1-017", "BT1-018"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker" },
            { card: "BT1-010", as: "secondAttacker" },
            { card: "BT1-011", as: "thirdAttacker" },
          ],
          deck: ["BT1-020", "BT1-021", "BT1-022", "BT1-023"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(3);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("thirdAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("supports normal yellow/purple cost 3 and Puppet cost 2 evolution, and rejects off-color level 3", async () => {
    for (const [baseCardId, useAlternateCost, memory] of [
      ["EX11-019", false, 3],
      ["BT3-077", false, 3],
      ["EX11-019", true, 2],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      s.state.memory = memory;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === cardId);
      expect(s.state.memory).toBe(0);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "base" }], hand: [{ card: cardId, as: "source" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
